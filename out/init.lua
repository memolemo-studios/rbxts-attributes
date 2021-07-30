-- Compiled with roblox-ts v1.2.3
local TS = _G[script]
local Janitor = TS.import(script, TS.getModule(script, "@rbxts", "janitor").src).Janitor
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
		if type(value) == "table" then
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
		return self:constructor(...) or self
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
		local _arg0 = function(newValue, key)
			local oldValue = self._attributes[key]
			if oldValue ~= newValue then
				self._bindable:Fire(key, newValue)
			end
		end
		-- ▼ ReadonlyMap.forEach ▼
		for _k, _v in pairs(rawAttributes) do
			_arg0(_v, _k, rawAttributes)
		end
		-- ▲ ReadonlyMap.forEach ▲
		-- Replacing attributes variable to new raw attributes map
		self._attributes = rawAttributes
	end
	function Attributes:get(key)
		return self._attributes[key]
	end
	function Attributes:getAll()
		-- Copy the entire attributes (for security)
		local copiedAttributes = copy(self._attributes)
		-- Locking it through metamethod
		setmetatable(copiedAttributes, {
			__index = function(_, index)
				local _arg0 = tostring(index)
				local _arg1 = self._instance:GetFullName()
				error(string.format("%s is not a valid attribute in %s", _arg0, _arg1))
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
		local _result
		if valueFromKey ~= nil then
			_result = valueFromKey
		else
			_result = defaultValue
		end
		return _result
	end
	function Attributes:set(key, value)
		-- Setting the attribute to the real attribute
		self._instance:SetAttribute(key, value)
	end
	function Attributes:setMultiple(tree)
		-- Convert this to map (so that typescript doesn't have conflicts with this)
		local treeToMap = tree
		local _arg0 = function(value, key)
			return self:set(key, value)
		end
		-- ▼ ReadonlyMap.forEach ▼
		for _k, _v in pairs(treeToMap) do
			_arg0(_v, _k, treeToMap)
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
		local value = self._attributes[key]
		local _exp = type(value) == "boolean"
		local _arg0 = tostring(key)
		local _arg1 = self._instance:GetFullName()
		local _arg1_1 = string.format("%s is not a boolean attribute in %s", _arg0, _arg1)
		assert(_exp, _arg1_1)
		self:set(key, not value)
	end
	function Attributes:increment(key, delta)
		local value = self._attributes[key]
		local _exp = type(value) == "number"
		local _arg0 = tostring(key)
		local _arg1 = string.format("%s is not a number attribute", _arg0)
		assert(_exp, _arg1)
		local finalDelta = type(delta) == "number" and delta or 1
		self:set(key, (value + finalDelta))
	end
	function Attributes:decrement(key, delta)
		-- Lazy method
		self:increment(key, type(delta) == "number" and -delta or -1)
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
		local __attributes = self._attributes
		local _arg0 = function(_, key)
			return self:delete(key)
		end
		-- ▼ ReadonlyMap.forEach ▼
		for _k, _v in pairs(__attributes) do
			_arg0(_v, _k, __attributes)
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
