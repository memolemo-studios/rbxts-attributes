/// <reference types="@rbxts/compiler-types" />
/// <reference types="@rbxts/types" />
/**
 * Attributes is a class where it handles Instance's attributes
 * with couple of perks and methods to make handling attributes a bit easier
 */
declare class Attributes<T extends Record<string, unknown> = {}> {
    private bindable;
    private disposables;
    private instance;
    private attributes;
    private isBusy;
    /**
     * An event only invokes when attributes' map is updated
     *
     * **NOTE:** This is not going to invoke if instance's attributes are changed
     */
    changed: RBXScriptSignal<(attribute: keyof T, value: unknown) => void>;
    constructor(instance: Instance);
    private updateAttributes;
    /**
     * Gets all of the attributes
     *
     * **NOTE:** This method returns as a readonly attributes map
     */
    getAll(): Readonly<T>;
    /**
     * Gets the value of desired attribute key
     * @param key
     */
    get<K extends keyof T>(key: K): Readonly<T[K]>;
    /**
     * Gets the value or another value from the paramter
     * of desired attribute key
     * @param key
     * @param defaultValue
     */
    getOr<K extends keyof T>(key: K, defaultValue: T[K]): Readonly<T[K]>;
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
     * adjusts it to the programmer's choice
     *
     * **This method supports undefined values**
     * @param key
     * @param callback
     */
    map<K extends keyof T, V = undefined>(key: K, callback: (value: Readonly<T[K]>) => V): V;
    /**
     * A useful method that allows to run in a callback parameter
     * if desired attribute's value is not nil or undefined
     *
     * **This is a synchronous method, if you want asynchronous method then
     * use ``andThenAsync`` instead**
     * @param key
     * @param callback
     */
    andThenSync<K extends keyof T>(key: K, callback: (value: Readonly<T[K]>) => void): void;
    /**
     * A useful method that allows to run in a callback parameter
     * if desired attribute's value is not nil or undefined
     *
     * **This is an asynchronous method, if you want synchronous method then
     * use ``andThenSync`` instead**
     * @param key
     * @param callback
     */
    andThenAsync<K extends keyof T>(key: K, callback: (value: Readonly<T[K]>) => void): void;
    /**
     * Wipes the entire attributes
     */
    wipe(): void;
    /**
     * Destroys the entire Attributes instance
     */
    destroy(): void;
}
export = Attributes;
