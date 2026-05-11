-- backup registered decorations then clear current

local old_decor = {}

for key, def in pairs(core.registered_decorations) do
	old_decor[key] = def
end

core.clear_registered_decorations()

-- list of default mods to remove from

local default_mods = {
	["default"] = 1,
	["flowers"] = 1,
	["butterflies"] = 1,
	["fireflies"] = 1
}

local function can_add(def)

	if type(def.schematic) == "string" and def.schematic:find("/default/schematics/") then
		return -- skip default schematics
	end

	local deco_list = type(def.decoration) == "table" and def.decoration or {def.decoration}
	local biomes = type(def.biomes) == "table" and def.biomes or {def.biomes}

	for _, deco in pairs(deco_list) do

		local mod = deco and deco:split(":")[1]

		if mod and default_mods[mod] then -- found a default mod

			for __, biome in pairs(biomes) do

				if ethereal.def_biomes[biome] then return end -- found a default biome
			end
		end
	end

	return true
end

for key, def in pairs(old_decor) do

	if can_add(def) then
		core.register_decoration(def)
		--print("-- added decor:", dump(def.decoration), def.schematic)
	else
		--print("-- removed decor:", dump(def.decoration), def.schematic)
	end
end
