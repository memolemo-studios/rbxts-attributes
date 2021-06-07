import { Janitor } from "@rbxts/janitor";

const RunService = game.GetService("RunService");

/**
 * Thread spawner
 */
function spawn<C extends Callback>(callback: C, ...args: Parameters<C>): void {
	const bindable = new Instance("BindableEvent");
	bindable.Event.Connect(() => callback(...(args as unknown[])));
	bindable.Fire();
	bindable.Destroy();
}

/**
 * Attributes is a class where it handles Instance's attributes
 * with couple of perks and methods to make handling attributes a bit easier
 */
class Attributes<T extends object = {}> {
	private bindable = new Instance("BindableEvent") as BindableEvent<(attribute: keyof T, value: unknown) => void>;
	private disposables = new Janitor();
	private instance: Instance;
	private attributes = new Map<keyof T, unknown>();

	// Useful variable to avoid multiple updates in updateAttributes method
	private isBusy = false;

	/**
	 * An event only invokes when attributes' map is updated
	 *
	 * **NOTE:** This is not going to invoke if instance's attributes are changed
	 */
	changed = this.bindable.Event;

	constructor(instance: Instance) {
		this.instance = instance;
		this.attributes = this.updateAttributes();

		let connection: RBXScriptConnection;

		// eslint-disable-next-line prefer-const
		connection = this.instance.AttributeChanged.Connect(() => this.updateAttributes());

		this.disposables.Add(this.bindable);
		this.disposables.Add(connection);
	}

	private updateAttributes(): Map<keyof T, unknown> {
		/* Making sure it is not busy (like nuking and stuff)  */
		if (this.isBusy) {
			return this.attributes;
		}

		const rawAttributes = this.instance.GetAttributes() as Map<keyof T, T[keyof T]>;

		/* Checking for any changes */
		const changedValues = new Map<keyof T, unknown>();
		rawAttributes.forEach((rawValue, rawKey) => {
			const valueFromMap = this.attributes;
			if (!valueFromMap.has(rawKey) || valueFromMap.get(rawKey) !== rawValue) {
				changedValues.set(rawKey, rawValue);
			}
		});

		/* Replacing attributes variable to new raw attributes map */
		this.attributes = rawAttributes;

		/* Then firing every changed attribute keys */
		spawn(() => changedValues.forEach((value, key) => this.bindable.Fire(key, value)));

		return rawAttributes;
	}

	/**
	 * Gets all of the attributes
	 *
	 * **NOTE:** This method returns as a readonly attributes map
	 */
	getAll(): Readonly<T> {
		const attributes = this.attributes;

		setmetatable(attributes, {
			__newindex: () => {
				error("Modifying attributes are not allowed!", 2);
			},

			__metatable: false as unknown as string,
		});

		return attributes as unknown as Readonly<T>;
	}

	/**
	 * Gets the value of desired attribute key
	 * @param key
	 */
	get<K extends keyof T>(key: K): Readonly<T[K]> {
		return this.attributes.get(key) as T[K];
	}

	/**
	 * Gets the value or another value from the paramter
	 * of desired attribute key
	 * @param key
	 * @param defaultValue
	 */
	getOr<K extends keyof T>(key: K, defaultValue: T[K]): Readonly<T[K]> {
		const value = this.has(key) ? this.get(key) : defaultValue;
		return value;
	}

	/**
	 * Sets the value of desired attribute key
	 * @param key
	 * @param value
	 */
	set<K extends keyof T>(key: K, value: T[K]): void {
		/* Setting an attribute to the real instance to automatically update it */
		this.instance.SetAttribute(key as string, value);
	}

	/**
	 * Sets the values of desired attribute keys
	 * @param tree
	 */
	setMultiple(tree: Partial<T>): void {
		const treeToMap = tree as unknown as Map<string, unknown>;
		treeToMap.forEach((v, k) => this.instance.SetAttribute(k, v));
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
		this.instance.SetAttribute(key as string, undefined);
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
	observe<K extends keyof T>(key: K, callback: (value: T[K]) => void): RBXScriptConnection {
		let connection: RBXScriptConnection;

		// eslint-disable-next-line prefer-const
		connection = this.changed.Connect((attribute, newValue) => {
			if ((key as unknown as K) === (attribute as unknown as K)) {
				callback(newValue as unknown as T[K]);
			}
		});

		this.disposables.Add(connection);
		return connection;
	}

	/**
	 * Waits for a specific attribute key to be non-undefined or non-nil value
	 * @param key
	 */
	waitFor<K extends keyof T>(key: K): Promise<T[K]> {
		let value = this.get(key);
		if (this.has(key)) {
			return Promise.resolve<T[K]>(value as T[K]);
		}

		const currentPromise = new Promise<T[K]>((resolve, _, onCancel) => {
			const promiseDisposables = new Janitor();
			promiseDisposables.Add(
				RunService.RenderStepped.Connect(() => {
					value = this.get(key);
					if (this.has(key)) {
						resolve(value as T[K]);
					}
				}),
			);
			onCancel(() => promiseDisposables.Destroy());
		});

		this.disposables.AddPromise(currentPromise);
		return currentPromise;
	}

	/**
	 * Toggles the attribute value
	 *
	 * **NOTE:** This is for boolean attributes only
	 * @param key
	 */
	toggle<K extends keyof T>(key: K): void {
		const value = this.attributes.get(key);

		assert(typeIs(value, "boolean"), "%s is not a boolean attribute".format(tostring(key)));
		this.set(key, !value as unknown as T[K]);
	}

	/**
	 * Increments the attribute value
	 *
	 * **NOTE:** This is for number attributes only
	 * @param key
	 * @param delta optional
	 */
	increment<K extends keyof T>(key: K, delta?: number): void {
		const value = this.attributes.get(key);
		assert(typeIs(value, "number"), "%s is not a number attribute".format(tostring(key)));

		const finalDelta = typeIs(delta, "number") ? delta : 1;
		this.set(key, (value + finalDelta) as unknown as T[K]);
	}

	/**
	 * Decrements the attribute value
	 *
	 * **NOTE:** This is for number attributes only
	 * @param key
	 * @param delta optional
	 */
	decrement<K extends keyof T>(key: K, delta?: number): void {
		const value = this.attributes.get(key);
		assert(typeIs(value, "number"), "%s is not a number attribute".format(tostring(key)));

		const finalDelta = typeIs(delta, "number") ? delta : 1;
		this.increment(key, finalDelta);
	}

	/**
	 * A useful method gets the attribute's value and
	 * adjusts it to the programmer's choice
	 *
	 * **This method supports undefined values**
	 * @param key
	 * @param callback
	 */
	map<K extends keyof T, V = undefined>(key: K, callback: (value: Readonly<T[K]>) => V): V {
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
	andThenSync<K extends keyof T>(key: K, callback: (value: Readonly<T[K]>) => void): void {
		this.waitFor(key).await();
		spawn(callback, this.get(key));
	}

	/**
	 * A useful method that allows to run in a callback parameter
	 * if desired attribute's value is not nil or undefined
	 *
	 * **This is an asynchronous method, if you want synchronous method then
	 * use ``andThenSync`` instead**
	 * @param key
	 * @param callback
	 */
	andThenAsync<K extends keyof T>(key: K, callback: (value: Readonly<T[K]>) => void): void {
		this.waitFor(key).then((value) => callback(value));
	}

	/**
	 * Wipes the entire attributes
	 */
	wipe(): void {
		this.isBusy = true;

		this.attributes.forEach((_, key) => this.delete(key));

		this.isBusy = false;
		this.attributes = this.updateAttributes();
	}

	/**
	 * Destroys the entire Attributes instance
	 *
	 * Use ``Destroy`` method in PascalCase if you're planning
	 * to clean it up automatically like Janitor and Maid
	 * @alias Destroy
	 */
	destroy(): void {
		this.disposables.Destroy();
	}

	/**
	 * Destroys the entire Attributes instance
	 *
	 * This method is meant for disposable cleaners like
	 * Janitor and Maid, because they cannot know if Destroy method
	 * is in PascalCase or camelCase
	 *
	 * This method has the same functionally as camelCase one
	 * @alias destroy
	 */
	Destroy() {
		this.disposables.Destroy();
	}
}

interface that {
	name: string;
	age: number;
}

export = Attributes;
