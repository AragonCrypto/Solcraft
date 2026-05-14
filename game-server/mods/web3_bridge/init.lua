local http = minetest.request_http_api()

if not http then
    minetest.log("error", "[Web3_Bridge] HTTP API nicht verfügbar! Setze 'secure.http_mods = web3_bridge' in minetest.conf!")
    return
end

print(">>> [DEBUG] SOLCRAFT: MOD '" .. minetest.get_current_modname() .. "' IS LOADING!")

local BACKEND_URL = "http://127.0.0.1:4000/api/sync-game"

-- ==========================================
-- 1. D-BLOCK (Decentralized Block) SETUP
-- ==========================================

minetest.register_node("web3_bridge:dblock", {
    description = "D-Block (Decentralized Market)",
    tiles = {"dblock.png"},
    groups = {cracky = 3, oddly_breakable_by_hand = 3},
    
    on_construct = function(pos)
        local meta = minetest.get_meta(pos)
        meta:set_string("infotext", "D-Block Handelsplatz")
        meta:set_string("price_amount", "1")
        meta:set_string("reward_amount", "1")
        
        -- Inventar für den Block erstellen
        local inv = meta:get_inventory()
        inv:set_size("left", 1)  -- Linker Slot (Was man zahlen muss)
        inv:set_size("right", 1) -- Rechter Slot (Was man dafür bekommt)
        
        -- Initiales Menü (Formspec) bauen
        meta:set_string("formspec", 
            "size[8,8]" ..
            "label[1.5,0.5;Gesucht (Zahlung)]" ..
            "list[nodemeta:"..pos.x..","..pos.y..","..pos.z..";left;2,1;1,1;]" ..
            "field[2.3,2.5;1,1;price_amount;Menge;1]" ..
            
            "label[4.5,0.5;Angebot (Ertrag)]" ..
            "list[nodemeta:"..pos.x..","..pos.y..","..pos.z..";right;5,1;1,1;]" ..
            "field[5.3,2.5;1,1;reward_amount;Menge;1]" ..
            
            "button[3.5,3.2;1,1;save;Speichern]" ..
            
            -- Spielerinventar unten anzeigen
            "list[current_player;main;0,4.2;8,4;]" ..
            "listring[nodemeta:"..pos.x..","..pos.y..","..pos.z..";left]" ..
            "listring[current_player;main]" ..
            "listring[nodemeta:"..pos.x..","..pos.y..","..pos.z..";right]" ..
            "listring[current_player;main]"
        )
    end,
    
    -- Wenn jemand auf "Speichern" drückt oder Enter in die Textfelder eingibt
    on_receive_fields = function(pos, formname, fields, sender)
        local meta = minetest.get_meta(pos)
        if fields.save or fields.price_amount or fields.reward_amount then
            local p_amount = fields.price_amount or meta:get_string("price_amount")
            local r_amount = fields.reward_amount or meta:get_string("reward_amount")
            
            -- Speichere die neuen Mengen ab
            meta:set_string("price_amount", p_amount)
            meta:set_string("reward_amount", r_amount)
            
            -- Update das Menü, damit die neuen Zahlen drin stehen bleiben!
            meta:set_string("formspec", 
                "size[8,8]" ..
                "label[1.5,0.5;Gesucht (Zahlung)]" ..
                "list[nodemeta:"..pos.x..","..pos.y..","..pos.z..";left;2,1;1,1;]" ..
                "field[2.3,2.5;1,1;price_amount;Menge;" .. p_amount .. "]" ..
                
                "label[4.5,0.5;Angebot (Ertrag)]" ..
                "list[nodemeta:"..pos.x..","..pos.y..","..pos.z..";right;5,1;1,1;]" ..
                "field[5.3,2.5;1,1;reward_amount;Menge;" .. r_amount .. "]" ..
                
                "button[3.5,3.2;1,1;save;Speichern]" ..
                "list[current_player;main;0,4.2;8,4;]" ..
                "listring[nodemeta:"..pos.x..","..pos.y..","..pos.z..";left]" ..
                "listring[current_player;main]" ..
                "listring[nodemeta:"..pos.x..","..pos.y..","..pos.z..";right]" ..
                "listring[current_player;main]"
            )
            minetest.chat_send_player(sender:get_player_name(), "[D-Block] Handelsmengen erfolgreich gespeichert!")
        end
    end,
})

-- Crafting-Rezept: 4 Gras = 1 D-Block
minetest.register_craft({
    output = "web3_bridge:dblock",
    recipe = {
        {"default:dirt", "default:dirt"},
        {"default:dirt", "default:dirt"}
    }
})


-- ==========================================
-- 2. WEB3 SYNC & NFT SKINS (Alle 10 Sekunden)
-- ==========================================

local function get_inventory_table(player)
    local inv = player:get_inventory()
    local main_list = inv:get_list("main")
    local items = {}

    for i, itemstack in ipairs(main_list) do
        if not itemstack:is_empty() then
            local name = itemstack:get_name()
            local count = itemstack:get_count()
            if items[name] then
                items[name] = items[name] + count
            else
                items[name] = count
            end
        end
    end
    return items
end

local timer = 0
minetest.register_globalstep(function(dtime)
    timer = timer + dtime
    if timer >= 10.0 then
        timer = 0

        for _, player in ipairs(minetest.get_connected_players()) do
            local player_name = player:get_player_name()
            local current_inv = get_inventory_table(player)

            local payload = {
                player_name = player_name,
                current_inventory = current_inv
            }

            local json_data = minetest.write_json(payload)

            print(">>>[WEB3] Sende Inventar von " .. player_name .. " an " .. BACKEND_URL)

            http.fetch({
                url = BACKEND_URL,
                post_data = json_data,
                timeout = 5,
                method = "POST",
                extra_headers = {"Content-Type: application/json"}
            }, function(res)
                if res.code == 200 then
                    local response_data = minetest.parse_json(res.data)

                    if response_data then
                        
                        -- === HIER PASSIERT DIE NFT-SKIN MAGIE ===
                        if response_data.active_skin then
                            local skin_filename = response_data.active_skin .. ".png"
                            -- Überschreibt das Aussehen des Spielers sofort!
                            player:set_properties({
                                textures = { skin_filename }
                            })
                        end

                        -- === INVENTAR EINZAHLUNGEN ===
                        if response_data.pending_injections then
                            for _, injection in ipairs(response_data.pending_injections) do
                                local item_string = injection.item_name .. " " .. tostring(injection.amount)
                                local itemstack = ItemStack(item_string)

                                local inv = player:get_inventory()
                                if inv:room_for_item("main", itemstack) then
                                    inv:add_item("main", itemstack)
                                    minetest.chat_send_player(player_name, "[Web3] " .. tostring(injection.amount) .. "x " .. injection.item_name .. " aus Solana Wallet erhalten!")
                                else
                                    minetest.chat_send_player(player_name, "[Web3] Dein Inventar ist voll! Einzahlung fehlgeschlagen.")
                                end
                            end
                        end
                        
                    end
                else
                    minetest.log("error", "[Web3_Bridge] Backend Fehler: " .. tostring(res.code))
                end
            end)
        end
    end
end)