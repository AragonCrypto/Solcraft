-- Liste der Items/Blöcke, die du bannen/verstecken willst
local banned_items = {
    "default:mese",
    "default:mese_crystal",
    -- Hier später einfach die Namen der Plantlife-Pflanzen eintragen, 
    -- die du weghaben willst, z.B.: "plantlife:weed"
}

for _, item in ipairs(banned_items) do
    if minetest.registered_items[item] then
        minetest.override_item(item, {
            groups = {not_in_creative_inventory = 1},
            drop = "", -- Droppt nichts mehr beim Abbauen
        })
    end
end

minetest.log("action", "[Environment] Unnötige Items wurden gebannt.")