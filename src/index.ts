import { Janitor } from "@rbxts/janitor";

/* Table stuff that rbxts doesn't support */
declare const table: {
	clear: (object: object) => void;
};

type ChangedAttributeCallback<T> = (attribute: keyof T, value: T[keyof T]) => void;
type MapObject<T> = Map<keyof T, T[keyof T]>;
type CheckableTypeParameter = keyof CheckableTypes | (keyof CheckableTypes)[];
type NonNullableObject<T extends object> = {
	[K in keyof T]: T[K] extends object ? NonNullableObject<T[K]> : NonNullable<T[K]>;
};

const RunService = game.GetService("RunService");

/// Utils ///
function throwErrorInstanceMessage(instance: Instance, message: string) {
	throw `${instance.GetFullName()} ${message}`;
}

function copy<T extends object>(tbl: T): T {
	const newTbl = {} as T;
	for (const [index, value] of pairs(tbl)) {
		if (typeIs(value, "table")) {
			newTbl[index as keyof T] = value as unknown as T[keyof T];
			continue;
		}
		newTbl[index as keyof T] = value as T[keyof T];
	}
	return newTbl;
}

/// Class ///
/**
 * Attributes is a class where it handles Instance's attributes
 * with couple of perks and methods to make handling attributes a bit easier
 */
class Attributes<T extends object = {}> {
	// Event and connection disposal
	private _disposables = new Janitor();

	// The entire map of attributes stored
	private _attributes = new Map<keyof T, T[keyof T]>();

	// Useful variable to avoid multiple updates in updateAttributes method
	private _isBusy = false;

	// Event
	private _bindable: BindableEvent<ChangedAttributeCallback<T>>;

	// Instance of the class
	private _instance: Instance;

	/**
	 * An event only invokes when attributes' map is updated
	 *
	 * **NOTE:** This is not going to invoke if instance's attributes are changed
	 */
	changed: RBXScriptSignal<ChangedAttributeCallback<T>>;

	constructor(instance: Instance) {
		this._instance = instance;
		this._bindable = new Instance("BindableEvent");
		this.changed = this._bindable.Event;

		// load attributes upon instantiating
		this._reloadAllAttributes();
		this._disposables.Add(this._instance.AttributeChanged.Connect(() => this._reloadAllAttributes()));
	}

	private _reloadAllAttributes() {
		/* Making sure it is not busy (critical stuff) */
		if (this._isBusy) return;

		/* Get the entire attributes from instance */
		const rawAttributes = this._instance.GetAttributes() as MapObject<T>;

		/* Checking for any changes */
		rawAttributes.forEach((newValue, key) => {
			const oldValue = this._attributes.get(key);
			if (oldValue !== newValue) {
				this._bindable.Fire(key, newValue);
			}
		});

		/* Replacing attributes variable to new raw attributes map */
		this._attributes = rawAttributes;
	}

	/**
	 * Automatically sets default attribute values
	 */
	default(attributes: { [K in keyof T]?: NonNullable<T[K]> }) {
		// eslint-disable-next-line roblox-ts/no-array-pairs
		for (const [key, value] of pairs(attributes)) {
			if (!this.has(key as keyof T)) {
				this.set(key as keyof T, value as NonNullable<T[keyof T]>);
			}
		}
	}

	/**
	 * Expects an attribute to have contents on it
	 * @param key
	 */
	expect<K extends keyof T>(key: K) {
		const value = this.get(key);
		if (value === undefined) {
			throwErrorInstanceMessage(this._instance, `needs '${key}' attribute to have a value`);
		}
	}

	/**
	 * Expects an attribute to have an exact type
	 * @param key
	 */
	expectType<K extends keyof T>(key: K, typeParam: CheckableTypeParameter) {
		const value = this.get(key);
		const valueTypeOf = typeOf(value);
		if (typeIs(typeParam, "string")) {
			if (valueTypeOf !== typeParam) {
				throwErrorInstanceMessage(
					this._instance,
					`expects '${key}' typeof '${typeParam}' but it is ${valueTypeOf}`,
				);
			}
		} else {
			for (const expected of typeParam) {
				if (valueTypeOf === expected) {
					return;
				}
			}
			throwErrorInstanceMessage(
				this._instance,
				`expects '${key}' typeof '${typeParam.map(v => `${v} or`)}' but it is ${valueTypeOf}`,
			);
		}
	}

	/**
	 * Expects attributes to have an exact type but it is a map
	 * @param key
	 */
	expectMultiple(
		attributes: {
			[K in keyof T]?: CheckableTypeParameter;
		},
	) {
		// eslint-disable-next-line roblox-ts/no-array-pairs
		for (const [key, typeOfs] of pairs(attributes)) {
			this.expectType(key as keyof T, typeOfs as CheckableTypeParameter);
		}
	}

	/**
	 * Gets the value of desired attribute key
	 * @param key
	 */
	get<K extends keyof T>(key: K) {
		return this._attributes.get(key) as T[K] | undefined;
	}

	/**
	 * Gets the entire attributes stored internally on a Map object
	 *
	 * **NOTE:** This method returns as a readonly object
	 * @returns Readonly attributes
	 */
	getAll() {
		/* Copy the entire attributes (for security) */
		return copy(this._attributes) as unknown as Partial<Readonly<T>>;
	}

	/**
	 * Gets the value or another value from the paramter
	 * of desired attribute key
	 * @param key
	 * @param defaultValue
	 */
	getOr<K extends keyof T>(key: K, defaultValue: NonNullable<T[K]>) {
		const valueFromKey = this.get(key);
		return valueFromKey !== undefined ? valueFromKey : defaultValue;
	}

	/**
	 * Sets the value of desired attribute key
	 * @param key
	 * @param value
	 */
	set<K extends keyof T>(key: K, value: NonNullable<T[K]>): void {
		/* Setting the attribute to the real attribute */
		this._instance.SetAttribute(key as string, value);
	}

	/**
	 * Sets the values of desired attribute keys
	 * @param tree
	 */
	setMultiple(tree: Partial<NonNullableObject<T>>): void {
		/* Convert this to map (so that typescript doesn't have conflicts with this) */
		const treeToMap = tree as unknown as MapObject<T>;
		treeToMap.forEach((value, key) => this.set(key, value as NonNullable<T[keyof T]>));
	}

	/**
	 * Deletes the value of desired attribute key
	 * @param key
	 */
	delete<K extends keyof T>(key: K): void {
		/**
		 * Setting an attribute to the real instance
		 * instance to automatically update it
		 *
		 * 'Just like .set() method'
		 */
		this._instance.SetAttribute(key as string, undefined);
	}

	/**
	 * Checks if that specific attribute key does exists
	 * in the attributes map table
	 * @param key
	 */
	has<K extends keyof T>(key: K): boolean {
		if (this.get(key) === undefined) {
			return false;
		}
		return true;
	}

	/**
	 * Observes every change in a specific attribute key
	 * @param key
	 */
	observe<K extends keyof T>(key: K, callback: (value: NonNullable<T[K]>) => void): RBXScriptConnection {
		const connection = this.changed.Connect((attribute, newValue) => {
			if (attribute === key) {
				callback(newValue as NonNullable<T[K]>);
			}
		});

		this._disposables.Add(connection);
		return connection;
	}

	/**
	 * Waits for a specific attribute key to be non-undefined or non-nil value
	 * @param key
	 */
	waitFor<K extends keyof T>(key: K): Promise<NonNullable<T[K]>> {
		let value = this.get(key);
		if (value !== undefined) {
			return Promise.resolve<NonNullable<T[K]>>(value as NonNullable<T[K]>);
		}

		const waitForPromise = new Promise<NonNullable<T[K]>>((resolve, _, onCancel) => {
			const promiseDisposal = new Janitor();
			promiseDisposal.Add(
				RunService.Heartbeat.Connect(() => {
					value = this.get(key);
					if (value !== undefined) {
						resolve(value as NonNullable<T[K]>);
					}
				}),
			);

			onCancel(() => promiseDisposal.Destroy());
		});

		this._disposables.AddPromise(waitForPromise);
		return waitForPromise;
	}

	/**
	 * Toggles the attribute value
	 *
	 * **NOTE:** This is for boolean attributes only
	 * @param key
	 */
	toggle<K extends keyof T>(key: K): void {
		const value = this._attributes.get(key);
		assert(
			typeIs(value, "boolean"),
			"%s is not a boolean attribute in %s".format(tostring(key), this._instance.GetFullName()),
		);
		this.set(key, !value as unknown as NonNullable<T[K]>);
	}

	/**
	 * Increments the attribute value
	 *
	 * **NOTE:** This is for number attributes only
	 * @param key
	 * @param delta optional
	 */
	increment<K extends keyof T>(key: K, delta?: number): void {
		const value = this._attributes.get(key);
		assert(typeIs(value, "number"), "%s is not a number attribute".format(tostring(key)));

		const finalDelta = typeIs(delta, "number") ? delta : 1;
		this.set(key, (value + finalDelta) as unknown as NonNullable<T[K]>);
	}

	/**
	 * Decrements the attribute value
	 *
	 * **NOTE:** This is for number attributes only
	 * @param key
	 * @param delta optional
	 */
	decrement<K extends keyof T>(key: K, delta?: number): void {
		/* Lazy method */
		this.increment(key, typeIs(delta, "number") ? -delta : -1);
	}

	/**
	 * A useful method gets the attribute's value and
	 * adjusts it to the everyone's choice
	 *
	 * **This method accepts undefined values however
	 * it is not neccessary**
	 * @param key
	 * @param callback
	 */
	map<K extends keyof T, V = void>(key: K, callback: (value: T[K] | undefined) => V): V {
		return callback(this.get(key));
	}

	/**
	 * A useful method that allows to run in a callback parameter
	 * if desired attribute's value is not nil or undefined
	 *
	 * **This is a synchronous method, if you want asynchronous method then
	 * use ``andThenAsync`` instead**
	 * @param key
	 * @param callback
	 */
	andThen<K extends keyof T>(key: K, callback: (value: T[K]) => void): void {
		const value = this.get(key);
		if (value !== undefined) {
			task.spawn(() => callback(value));
		}
	}

	/**
	 * Wipes the entire attributes
	 */
	wipe(): void {
		this._isBusy = true;
		this._attributes.forEach((_, key) => this.delete(key));
		this._isBusy = false;

		this._reloadAllAttributes();
	}

	/**
	 * Destroys the entire Attributes instance
	 *
	 * Use ``Destroy`` method in PascalCase if you're planning
	 * to clean it up automatically like Janitor and Maid
	 * @alias Destroy
	 */
	destroy(): void {
		this._disposables.Destroy();
		table.clear(this);
		setmetatable(this, {
			__index: () => error("This attributes instance is already destroyed!"),
			__newindex: () => error("Cannot modify destroyed attributes"),
			__metatable: undefined as unknown as string,
		});
	}

	/**
	 * Destroys the entire Attributes instance
	 *
	 * This method is meant for disposable cleaners like
	 * Janitor and Maid, because they cannot know if Destroy method
	 * is in PascalCase or camelCase
	 *
	 * This method has the same functionally as camelCase one
	 * @alias Destroy
	 */
	Destroy() {
		this.destroy();
	}
}

export = Attributes;
