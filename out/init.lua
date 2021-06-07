-- Compiled with roblox-ts v1.1.1
local TS = _G[script]
local Janitor = TS.import(script, TS.getModule(script, "janitor").src).Janitor
local RunService = game:GetService("RunService")
--[[
	*
	* Thread spawner
]]
local function spawn(callback, ...)
	local args = { ... }
	local bindable = Instance.new("BindableEvent")
	bindable.Event:Connect(function()
		return callback(unpack(args))
	end)
	bindable:Fire()
	bindable:Destroy()
end
--[[
	*
	* Attributes is a class where it handles Instance's attributes
	* with couple of perks and methods to make handling attributes a bit easier
]]
local Attributes
do
	Attributes = setmetatable({}, {
		__tostring = function()
			return "Attributes"
		end,
	})
	Attributes.__index = Attributes
	function Attributes.new(...)
		local self = setmetatable({}, Attributes)
		self:constructor(...)
		return self
	end
	function Attributes:constructor(instance)
		self.bindable = Instance.new("BindableEvent")
		self.disposables = Janitor.new()
		self.attributes = {}
		self.isBusy = false
		self.changed = self.bindable.Event
		self.instance = instance
		self.attributes = self:updateAttributes()
		local connection
		-- eslint-disable-next-line prefer-const
		connection = self.instance.AttributeChanged:Connect(function()
			return self:updateAttributes()
		end)
		self.disposables:Add(self.bindable)
		self.disposables:Add(connection)
	end
	function Attributes:updateAttributes()
		-- Making sure it is not busy (like nuking and stuff)
		if self.isBusy then
			return self.attributes
		end
		local rawAttributes = self.instance:GetAttributes()
		-- Checking for any changes
		local changedValues = {}
		local _0 = rawAttributes
		local _1 = function(rawValue, rawKey)
			local valueFromMap = self.attributes
			local _2 = valueFromMap
			local _3 = rawKey
			local _4 = not (_2[_3] ~= nil)
			if not _4 then
				local _5 = valueFromMap
				local _6 = rawKey
				_4 = _5[_6] ~= rawValue
			end
			if _4 then
				local _5 = changedValues
				local _6 = rawKey
				local _7 = rawValue
				-- ▼ Map.set ▼
				_5[_6] = _7
				-- ▲ Map.set ▲
			end
		end
		-- ▼ ReadonlyMap.forEach ▼
		for _2, _3 in pairs(_0) do
			_1(_3, _2, _0)
		end
		-- ▲ ReadonlyMap.forEach ▲
		-- Replacing attributes variable to new raw attributes map
		self.attributes = rawAttributes
		-- Then firing every changed attribute keys
		spawn(function()
			local _2 = changedValues
			local _3 = function(value, key)
				return self.bindable:Fire(key, value)
			end
			-- ▼ ReadonlyMap.forEach ▼
			for _4, _5 in pairs(_2) do
				_3(_5, _4, _2)
			end
			-- ▲ ReadonlyMap.forEach ▲
			return nil
		end)
		return rawAttributes
	end
	function Attributes:getAll()
		local attributes = self.attributes
		setmetatable(attributes, {
			__newindex = function()
				error("Modifying attributes are not allowed!", 2)
			end,
			__metatable = false,
		})
		return attributes
	end
	function Attributes:get(key)
		local _0 = self.attributes
		local _1 = key
		return _0[_1]
	end
	function Attributes:getOr(key, defaultValue)
		local _0
		if self:has(key) then
			_0 = self:get(key)
		else
			_0 = defaultValue
		end
		local value = _0
		return value
	end
	function Attributes:set(key, value)
		-- Setting an attribute to the real instance to automatically update it
		self.instance:SetAttribute(key, value)
	end
	function Attributes:setMultiple(tree)
		local treeToMap = tree
		local _0 = treeToMap
		local _1 = function(v, k)
			return self.instance:SetAttribute(k, v)
		end
		-- ▼ ReadonlyMap.forEach ▼
		for _2, _3 in pairs(_0) do
			_1(_3, _2, _0)
		end
		-- ▲ ReadonlyMap.forEach ▲
	end
	function Attributes:delete(key)
		--[[
			*
			* Setting an attribute to the real instance
			* instance to automatically update it
			*
			* 'Just like .set() method'
		]]
		self.instance:SetAttribute(key, nil)
	end
	function Attributes:has(key)
		if self:get(key) == nil then
			return false
		end
		return true
	end
	function Attributes:observe(key, callback)
		local connection
		-- eslint-disable-next-line prefer-const
		connection = self.changed:Connect(function(attribute, newValue)
			if key == attribute then
				callback(newValue)
			end
		end)
		self.disposables:Add(connection)
		return connection
	end
	function Attributes:waitFor(key)
		local value = self:get(key)
		if self:has(key) then
			return TS.Promise.resolve(value)
		end
		local currentPromise = TS.Promise.new(function(resolve, _, onCancel)
			local promiseDisposables = Janitor.new()
			promiseDisposables:Add(RunService.RenderStepped:Connect(function()
				value = self:get(key)
				if self:has(key) then
					resolve(value)
				end
			end))
			onCancel(function()
				return promiseDisposables:Destroy()
			end)
		end)
		self.disposables:AddPromise(currentPromise)
		return currentPromise
	end
	function Attributes:toggle(key)
		local _0 = self.attributes
		local _1 = key
		local value = _0[_1]
		local _2 = value
		local _3 = type(_2) == "boolean"
		local _4 = tostring(key)
		local _5 = string.format("%s is not a boolean attribute", _4)
		assert(_3, _5)
		self:set(key, not value)
	end
	function Attributes:increment(key, delta)
		local _0 = self.attributes
		local _1 = key
		local value = _0[_1]
		local _2 = value
		local _3 = type(_2) == "number"
		local _4 = tostring(key)
		local _5 = string.format("%s is not a number attribute", _4)
		assert(_3, _5)
		local _6 = delta
		local finalDelta = type(_6) == "number" and delta or 1
		self:set(key, (value + finalDelta))
	end
	function Attributes:decrement(key, delta)
		local _0 = self.attributes
		local _1 = key
		local value = _0[_1]
		local _2 = value
		local _3 = type(_2) == "number"
		local _4 = tostring(key)
		local _5 = string.format("%s is not a number attribute", _4)
		assert(_3, _5)
		local _6 = delta
		local finalDelta = type(_6) == "number" and delta or 1
		self:increment(key, finalDelta)
	end
	function Attributes:map(key, callback)
		return callback(self:get(key))
	end
	function Attributes:andThenSync(key, callback)
		self:waitFor(key):await()
		spawn(callback, self:get(key))
	end
	function Attributes:andThenAsync(key, callback)
		local _0 = self:waitFor(key)
		local _1 = function(value)
			return callback(value)
		end
		_0:andThen(_1)
	end
	function Attributes:wipe()
		self.isBusy = true
		local _0 = self.attributes
		local _1 = function(_, key)
			return self:delete(key)
		end
		-- ▼ ReadonlyMap.forEach ▼
		for _2, _3 in pairs(_0) do
			_1(_3, _2, _0)
		end
		-- ▲ ReadonlyMap.forEach ▲
		self.isBusy = false
		self.attributes = self:updateAttributes()
	end
	function Attributes:destroy()
		self.disposables:Destroy()
	end
	function Attributes:Destroy()
		self.disposables:Destroy()
	end
end
return Attributes
