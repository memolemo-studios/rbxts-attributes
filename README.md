# @rbxts/attributes

A simple attribute management system to make modifying attributes a bit easier

## Usage

```ts
import Attributes from "@rbxts/attributes";
import { Players } from "@rbxts/services";

interface IRobotAttributes {
	ownerId: number;
	characterId: number;
	age: number;
}

const robotModel = new Instance("Model");
const robotAttribs = new Attributes<IRobotAttributes>(robotModel);
robotAttribs.waitForAsync("ownerId", (ownerId) => {
	if (Players.LocalPlayer.UserId === ownerId) {
		// stuff
	}
});

const humanoid = robotModel.WaitForChild("Humanoid") as Humanoid;
humanoid.Died.Connect(() => robotAttribs.destroy());
```

## Installation

**This package is requires @rbxts/janitor!**

This is going to be a temporary installation. Coming soon, you can
install this module with @rbxts/attributes.

## Contribution

You may edit my module inside the src folder
​
