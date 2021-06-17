/// <reference types="@rbxts/types" />
/// <reference types="@rbxts/compiler-types" />
declare type ChangedAttributeCallback<T> = (attribute: keyof T, value: T[keyof T]) => void;
/**
 * Attributes is a class where it handles Instance's attributes
 * with couple of perks and methods to make handling attributes a bit easier
 */
declare class Attributes<T extends object = {}> {
    private _disposables;
    private _attributes;
    private _isBusy;
    private _bindable;
    private _instance;
    /**
     * An event only invokes when attributes' map is updated
     *
     * **NOTE:** This is not going to invoke if instance's attributes are changed
     */
    changed: RBXScriptSignal<ChangedAttributeCallback<T>>;
    constructor(instance: Instance);
    private _reloadAllAttributes;
    /**
     * Gets the value of desired attribute key
     * @param key
     */
    get<K extends keyof T>(key: K): T[K];
    /**
     * Gets the entire attributes stored internally on a Map object
     *
     * **NOTE:** This method returns as a readonly object
     * @returns Readonly attributes
     */
    getAll(): Readonly<T>;
    /**
     * Gets the value or another value from the paramter
     * of desired attribute key
     * @param key
     * @param defaultValue
     */
    getOr<K extends keyof T>(key: K, defaultValue: T[K]): T[K];
    /**
     * Sets the value of desired attribute key
     * @param key
     * @param value
     */
    set<K extends keyof T>(key: K, value: T[K]): void;
    /**
     * Sets the values of desired attribute keys
     * @param tree
     */
    setMultiple(tree: Partial<T>): void;
    /**
     * Deletes the value of desired attribute key
     * @param key
     */
    delete<K extends keyof T>(key: K): void;
    /**
     * Checks if that specific attribute key does exists
     * in the attributes map table
     * @param key
     */
    has<K extends keyof T>(key: K): boolean;
    /**
     * Observes every change in a specific attribute key
     * @param key
     */
    observe<K extends keyof T>(key: K, callback: (value: T[K]) => void): RBXScriptConnection;
    /**
     * Waits for a specific attribute key to be non-undefined or non-nil value
     * @param key
     */
    waitFor<K extends keyof T>(key: K): Promise<T[K]>;
    /**
     * Toggles the attribute value
     *
     * **NOTE:** This is for boolean attributes only
     * @param key
     */
    toggle<K extends keyof T>(key: K): void;
    /**
     * Increments the attribute value
     *
     * **NOTE:** This is for number attributes only
     * @param key
     * @param delta optional
     */
    increment<K extends keyof T>(key: K, delta?: number): void;
    /**
     * Decrements the attribute value
     *
     * **NOTE:** This is for number attributes only
     * @param key
     * @param delta optional
     */
    decrement<K extends keyof T>(key: K, delta?: number): void;
    /**
     * A useful method gets the attribute's value and
     * adjusts it to the everyone's choice
     *
     * **This method accepts undefined values however
     * it is not neccessary**
     * @param key
     * @param callback
     */
    map<K extends keyof T, V = void>(key: K, callback: (value: Readonly<T[K]>) => V): V;
    /**
     * A useful method that allows to run in a callback parameter
     * if desired attribute's value is not nil or undefined
     *
     * **This is a synchronous method, if you want asynchronous method then
     * use ``andThenAsync`` instead**
     * @param key
     * @param callback
     */
    andThen<K extends keyof T>(key: K, callback: (value: T[K]) => void): void;
    /**
     * Wipes the entire attributes
     */
    wipe(): void;
    /**
     * Destroys the entire Attributes instance
     *
     * Use ``Destroy`` method in PascalCase if you're planning
     * to clean it up automatically like Janitor and Maid
     * @alias Destroy
     */
    destroy(): void;
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
    Destroy(): void;
}
export = Attributes;
