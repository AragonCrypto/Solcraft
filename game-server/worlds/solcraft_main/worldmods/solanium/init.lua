-- 1. Das abgebaute Item (Lump)
minetest.register_craftitem("solanium:lump", {
    description = "Solanium Lump",
    inventory_image = "solanium_lump.png",
})

-- 2. Die Münze (Coin) - Die eigentliche Währung
minetest.register_craftitem("solanium:coin", {
    description = "Solanium Coin",
    inventory_image = "solanium_coin.png",
})

-- 3. Das Erz (Block in der Welt)
minetest.register_node("solanium:ore", {
    description = "Solanium Ore",
    tiles = {"default_stone.png^solanium_mineral.png"},
    groups = {cracky = 3}, -- Abbau-Härte (wie Stein/Erze)
    drop = "solanium:lump",
    light_source = 4, -- Leuchtet ganz leicht im Dunkeln
})

-- 4. Map-Generation (Spawnt in Gruppen von 4 bis 12)
minetest.register_ore({
    ore_type       = "scatter",
    ore            = "solanium:ore",
    wherein        = "default:stone",
    clust_scarcity = 12 * 12 * 12, -- Wie selten es ist (je höher, desto seltener)
    clust_num_ores = 10,           -- Durchschnittliche Menge pro Ader (zwischen 4 und 12)
    clust_size     = 4,            -- Größe des Clusters
    y_max          = -50,          -- Spawnt erst ab 50 Blöcke tief
    y_min          = -30000,
})

-- 5. Der langsame Schmelzprozess im Ofen
minetest.register_craft({
    type = "cooking",
    output = "solanium:coin",
    recipe = "solanium:lump",
    cooktime = 30, -- 30 Sekunden! Sehr langsam, wie von dir gewünscht.
})

minetest.log("action", "[Solanium] Wirtschaft geladen.")