
-- backup registered biomes then clear current

local old_biomes = {}

for key, def in pairs(core.registered_biomes) do
	old_biomes[key] = def
end

core.clear_registered_biomes()

-- list of default biomes to remove

ethereal.def_biomes = {
	["rainforest"] = 1,
	["rainforest_swamp"] = 1,
	["rainforest_ocean"] = 1,
	["rainforest_under"] = 1,
	["grassland"] = 1,
	["grassland_dunes"] = 1,
	["grassland_ocean"] = 1,
	["grassland_under"] = 1,
	["taiga"] = 1,
	["taiga_ocean"] = 1,
	["taiga_under"] = 1,
	["icesheet"] = 1,
	["icesheet_ocean"] = 1,
	["icesheet_under"] = 1,
	["snowy_grassland"] = 1,
	["snowy_grassland_ocean"] = 1,
	["snowy_grassland_under"] = 1,
	["desert"] = 1,
	["desert_ocean"] = 1,
	["desert_under"] = 1,
	["tundra"] = 1,
	["tundra_highland"] = 1,
	["tundra_beach"] = 1,
	["tundra_ocean"] = 1,
	["tundra_under"] = 1,
	["sandstone_desert"] = 1,
	["sandstone_desert_ocean"] = 1,
	["sandstone_desert_under"] = 1,
	["savanna"] = 1,
	["savanna_shore"] = 1,
	["savanna_ocean"] = 1,
	["savanna_under"] = 1,
	["cold_desert"] = 1,
	["cold_desert_ocean"] = 1,
	["cold_desert_under"] = 1,
	["coniferous_forest"] = 1,
	["coniferous_forest_dunes"] = 1,
	["coniferous_forest_ocean"] = 1,
	["coniferous_forest_under"] = 1,
	["deciduous_forest"] = 1,
	["deciduous_forest_shore"] = 1,
	["deciduous_forest_ocean"] = 1,
	["deciduous_forest_under"] = 1
}

-- only re-register biomes that aren't on the list

for key, def in pairs(old_biomes) do

	if ethereal.def_biomes[key] then
		--print("-- removed biome:", key)
	else
		core.register_biome(def)
		--print("-- registered biome:", key)
	end
end
