local http = minetest.request_http_api()
if not http then
    minetest.log("error", "CRITICAL ERROR: HTTP API nicht verfuegbar!")
    return
end

local function send_inventory_update(player_name, action, item_name, count)
    if not player_name or not item_name then return end
    
    http.fetch({
        url = "http://localhost:4000/api/mine-block", -- Endpoint reverted to prevent 404
        post_data = minetest.write_json({
            player = player_name,
            action = action,
            item = item_name,
            amount = count or 1
        }),
        extra_headers = { "Content-Type: application/json" }
    }, function(res) end)
end

-- 1. Digging (Item ADDED to inventory)
minetest.register_on_dignode(function(pos, oldnode, digger)
    if digger and digger:is_player() then
        send_inventory_update(digger:get_player_name(), "add", oldnode.name, 1)
    end
end)

-- 2. Placing (Item REMOVED from inventory)
minetest.register_on_placenode(function(pos, newnode, placer, oldnode, itemstack, pointed_thing)
    if placer and placer:is_player() then
        send_inventory_update(placer:get_player_name(), "remove", newnode.name, 1)
    end
end)

-- 3. Crafting (Item ADDED to inventory, ingredients REMOVED)
minetest.register_on_craft(function(itemstack, player, old_craft_grid, craft_inv)
    if player and player:is_player() then
        local pname = player:get_player_name()
        -- Result added
        send_inventory_update(pname, "add", itemstack:get_name(), itemstack:get_count())
        
        -- Ingredients removed (Minetest removes 1 from each used slot in the grid)
        for _, stack in ipairs(old_craft_grid) do
            if not stack:is_empty() then
                send_inventory_update(pname, "remove", stack:get_name(), 1)
            end
        end
    end
end)

-- 4. Picking up item (Item ADDED to inventory)
minetest.register_on_item_pickup(function(itemstack, picker, pointed_thing, time_from_last_punch)
    if picker and picker:is_player() then
        send_inventory_update(picker:get_player_name(), "add", itemstack:get_name(), itemstack:get_count())
    end
    return nil -- Continue default behavior (add to inventory)
end)

-- 5. Interacting with chests or other formspecs
minetest.register_on_player_inventory_action(function(player, action, inventory, inventory_info)
    if not player or not player:is_player() then return end
    
    local pname = player:get_player_name()
    if action == "put" then
        -- "put" means the player put something INTO their inventory FROM somewhere else
        if inventory_info and inventory_info.stack then
            send_inventory_update(pname, "add", inventory_info.stack:get_name(), inventory_info.stack:get_count())
        end
    elseif action == "take" then
        -- "take" means the player took something FROM their inventory and put it somewhere else
        if inventory_info and inventory_info.stack then
            send_inventory_update(pname, "remove", inventory_info.stack:get_name(), inventory_info.stack:get_count())
        end
    end
    -- "move" means moving within the same inventory, so no total change.
end)

-- 6. Dropping an item (Item REMOVED from inventory)
local old_item_drop = minetest.item_drop
minetest.item_drop = function(itemstack, dropper, pos)
    if dropper and dropper:is_player() then
        send_inventory_update(dropper:get_player_name(), "remove", itemstack:get_name(), itemstack:get_count())
    end
    return old_item_drop(itemstack, dropper, pos)
end

-- 7. Player Dies
minetest.register_on_dieplayer(function(player)
    if player and player:is_player() then
        send_inventory_update(player:get_player_name(), "die", "none", 0)
    end
end)

-- Replace the test block to prevent Unknown Node errors
minetest.register_node("web3_bridge:solana_ore", {
    description = "Solana Ore",
    tiles = {"default_gold_block.png"}, 
    groups = {cracky = 3},
})