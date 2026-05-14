-- Hilfsfunktion: Simuliert den Trigger an dein React-Frontend
local function trigger_frontend(player, action, data)
    local name = player:get_player_name()
    -- Für heute Nacht: Gibt den Text einfach im Chat aus, damit du siehst, dass es klappt.
    -- Morgen leiten wir das per WebSocket an React weiter!
    minetest.chat_send_player(name, "[WEB3 TRIGGER] Öffne Menü: " .. action)
end

-- 1. Der D-Block (Marktplatz)
minetest.register_node("defi:dblock", {
    description = "Decentralized Block (D-Block)",
    tiles = {"defi_dblock.png"},
    groups = {choppy = 2, oddly_breakable_by_hand = 1},
    on_rightclick = function(pos, node, clicker, itemstack, pointed_thing)
        trigger_frontend(clicker, "D_BLOCK_MENU", {})
    end,
})

-- 2. NFT Door (Vorerst als magischer Block, der als Tür fungiert)
minetest.register_node("defi:nft_door", {
    description = "NFT Access Door",
    tiles = {"defi_nft_door.png"},
    groups = {cracky = 1, level = 2}, -- Schwer abzubauen
    on_rightclick = function(pos, node, clicker, itemstack, pointed_thing)
        trigger_frontend(clicker, "NFT_CHECK", {door_pos = pos})
    end,
})

-- 3. Toll Door (Maut-Tür)
minetest.register_node("defi:toll_door", {
    description = "Toll Door (Paywall)",
    tiles = {"defi_toll_door.png"},
    groups = {cracky = 1, level = 2},
    on_rightclick = function(pos, node, clicker, itemstack, pointed_thing)
        trigger_frontend(clicker, "PAY_TOLL", {cost = "1 Solanium"})
    end,
})

-- 4. Billboard (Werbetafel)
minetest.register_node("defi:billboard", {
    description = "Ad Billboard",
    tiles = {"defi_billboard.png"},
    groups = {choppy = 2},
    on_rightclick = function(pos, node, clicker, itemstack, pointed_thing)
        trigger_frontend(clicker, "UPLOAD_AD", {})
    end,
})

-- 5. Der NFT Loader (Die leuchtende Leinwand mit dem Fragezeichen)
-- Du baust diesen Block später einfach in einem 4x4 Quadrat in der Welt auf.
minetest.register_node("defi:nft_loader", {
    description = "NFT Loader Frame",
    tiles = {"defi_nft_loader.png"},
    paramtype2 = "facedir", -- Kann in verschiedene Richtungen platziert werden
    light_source = 10, -- Leuchtet stark (glühende Umrandung)
    groups = {cracky = 2},
    on_rightclick = function(pos, node, clicker, itemstack, pointed_thing)
        trigger_frontend(clicker, "LOAD_NFT", {})
    end,
})

minetest.log("action", "[DeFi] Web3 Blöcke geladen.")