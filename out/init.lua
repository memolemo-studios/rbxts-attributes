-- Compiled with roblox-ts v1.1.1
local TS = _G[script]
local Janitor = TS.import(script, TS.getModule(script, "janitor").src).Janitor
-- Table stuff that rbxts doesn't support
local RunService = game:GetService("RunService")
-- / Utils ///
local function spawn(callback, ...)
	local args = { ... }
	local bindable = Instance.new("BindableEvent")
	bindable.Event:Connect(function()
		return callback(unpack(args))
	end)
	bindable:Fire()
	bindable:Destroy()
end
local function copy(tbl)
	local newTbl = {}
	for index, value in pairs(tbl) do
		local _0 = value
		if type(_0) == "table" then
			newTbl[index] = value
			continue
		end
		newTbl[index] = value
	end
	return newTbl
end
-- / Class ///
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
		self._disposables = Janitor.new()
		self._attributes = {}
		self._isBusy = false
		self._instance = instance
		self._bindable = Instance.new("BindableEvent")
		self.changed = self._bindable.Event
		self._disposables:Add(self._instance.AttributeChanged:Connect(function()
			return self:_reloadAllAttributes()
		end))
	end
	function Attributes:_reloadAllAttributes()
		-- Making sure it is not busy (critical stuff)
		if self._isBusy then
			return nil
		end
		-- Get the entire attributes from instance
		local rawAttributes = self._instance:GetAttributes()
		-- Checking for any changes
		local _0 = rawAttributes
		local _1 = function(newValue, key)
			local _2 = self._attributes
			local _3 = key
			local oldValue = _2[_3]
			if oldValue ~= newValue then
				self._bindable:Fire(key, newValue)
			end
		end
		-- ▼ ReadonlyMap.forEach ▼
		for _2, _3 in pairs(_0) do
			_1(_3, _2, _0)
		end
		-- ▲ ReadonlyMap.forEach ▲
		-- Replacing attributes variable to new raw attributes map
		self._attributes = rawAttributes
	end
	function Attributes:get(key)
		local _0 = self._attributes
		local _1 = key
		return _0[_1]
	end
	function Attributes:getAll()
		-- Copy the entire attributes (for security)
		local copiedAttributes = copy(self._attributes)
		-- Locking it through metamethod
		setmetatable(copiedAttributes, {
			__index = function(_, index)
				local _0 = tostring(index)
				local _1 = self._instance:GetFullName()
				error(string.format("%s is not a valid attribute in %s", _0, _1))
			end,
			__newindex = function()
				error("GetAll method returns readonly map!")
			end,
		})
		-- Returned
		return copiedAttributes
	end
	function Attributes:getOr(key, defaultValue)
		local valueFromKey = self:get(key)
		local _0
		if valueFromKey ~= nil then
			_0 = valueFromKey
		else
			_0 = defaultValue
		end
		return _0
	end
	function Attributes:set(key, value)
		-- Setting the attribute to the real attribute
		self._instance:SetAttribute(key, value)
	end
	function Attributes:setMultiple(tree)
		-- Convert this to map (so that typescript doesn't have conflicts with this)
		local treeToMap = tree
		local _0 = treeToMap
		local _1 = function(value, key)
			return self:set(key, value)
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
		self._instance:SetAttribute(key, nil)
	end
	function Attributes:has(key)
		if self:get(key) == nil then
			return false
		end
		return true
	end
	function Attributes:observe(key, callback)
		local connection = self.changed:Connect(function(attribute, newValue)
			if attribute == key then
				callback(newValue)
			end
		end)
		self._disposables:Add(connection)
		return connection
	end
	function Attributes:waitFor(key)
		local value = self:get(key)
		if value ~= nil then
			return TS.Promise.resolve(value)
		end
		local waitForPromise = TS.Promise.new(function(resolve, _, onCancel)
			local promiseDisposal = Janitor.new()
			promiseDisposal:Add(RunService.Heartbeat:Connect(function()
				value = self:get(key)
				if value ~= nil then
					resolve(value)
				end
			end))
			onCancel(function()
				return promiseDisposal:Destroy()
			end)
		end)
		self._disposables:AddPromise(waitForPromise)
		return waitForPromise
	end
	function Attributes:toggle(key)
		local _0 = self._attributes
		local _1 = key
		local value = _0[_1]
		local _2 = value
		local _3 = type(_2) == "boolean"
		local _4 = tostring(key)
		local _5 = self._instance:GetFullName()
		local _6 = string.format("%s is not a boolean attribute in %s", _4, _5)
		assert(_3, _6)
		self:set(key, not value)
	end
	function Attributes:increment(key, delta)
		local _0 = self._attributes
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
		-- Lazy method
		local _0 = self
		local _1 = delta
		_0:increment(key, type(_1) == "number" and -delta or -1)
	end
	function Attributes:map(key, callback)
		return callback(self:get(key))
	end
	function Attributes:andThen(key, callback)
		local value = self:get(key)
		if value ~= nil then
			spawn(function()
				return callback(value)
			end)
		end
	end
	function Attributes:wipe()
		self._isBusy = true
		local _0 = self._attributes
		local _1 = function(_, key)
			return self:delete(key)
		end
		-- ▼ ReadonlyMap.forEach ▼
		for _2, _3 in pairs(_0) do
			_1(_3, _2, _0)
		end
		-- ▲ ReadonlyMap.forEach ▲
		self._isBusy = false
		self:_reloadAllAttributes()
	end
	function Attributes:destroy()
		self._disposables:Destroy()
		table.clear(self)
		setmetatable(self, {
			__index = function()
				return error("This attributes instance is already destroyed!")
			end,
			__newindex = function()
				return error("Cannot modify destroyed attributes")
			end,
			__metatable = nil,
		})
	end
	function Attributes:Destroy()
		self:destroy()
	end
end
return Attributes
