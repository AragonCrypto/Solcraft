local http = minetest.request_http_api()

if not http then
    minetest.log("error", "[Web3_Bridge] HTTP API nicht verfügbar! Setze 'secure.http_mods = web3_bridge' in minetest.conf!")
    return
end

local BACKEND_URL = "http://127.0.0.1:4000/api/sync-game"

-- Hilfsfunktion: Inventar auslesen
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

-- Timer für den 10-Sekunden Loop
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
            
            -- Sende Daten ans Backend und warte auf "Injections"
            http.fetch({
                url = BACKEND_URL,
                post_data = json_data,
                timeout = 5,
                method = "POST",
                extra_headers = {"Content-Type: application/json"}
            }, function(res)
                if res.code == 200 then
                    local response_data = minetest.parse_json(res.data)
                    
                    -- Wenn Web3-Einzahlungen anstehen, gib sie dem Spieler!
                    if response_data and response_data.pending_injections then
                        for _, injection in ipairs(response_data.pending_injections) do
                            local item_string = injection.item_name .. " " .. tostring(injection.amount)
                            local itemstack = ItemStack(item_string)
                            
                            local inv = player:get_inventory()
                            if inv:room_for_item("main", itemstack) then
                                inv:add_item("main", itemstack)
                                minetest.chat_send_player(player_name, "[Web3] " .. tostring(injection.amount) .. "x " .. injection.item_name .. " aus Solana Wallet erhalten!")
                            else
                                minetest.chat_send_player(player_name, "[Web3] Dein Inventar ist voll! Einzahlung fehlgeschlagen.")
                                -- In einem echten System müssten wir das ans Backend zurückmelden, 
                                -- damit es nicht auf DONE gesetzt wird. Für den Hackathon reicht das erstmal.
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