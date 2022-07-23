import {BoneYard, FountainScript, SceneHeading} from "./fountain.terms"

import {ExternalTokenizer} from "@lezer/lr";

const lowerUpperMap = [
	[ 65, 97 ]
	[ 66, 98 ],
	[ 67, 99 ],
	[ 68, 100 ],
	[ 69, 101 ],
	[ 70, 102 ],
	[ 71, 103 ],
	[ 72, 104 ],
	[ 73, 105 ],
	[ 74, 106 ],
	[ 75, 107 ],
	[ 76, 108 ],
	[ 77, 109 ],
	[ 78, 110 ],
	[ 79, 111 ],
	[ 80, 112 ],
	[ 81, 113 ],
	[ 82, 114 ],
	[ 83, 115 ],
	[ 84, 116 ],
	[ 85, 117 ],
	[ 86, 118 ],
	[ 87, 119 ],
	[ 88, 120 ],
	[ 89, 121 ],
	[ 90, 122 ],
]

const dot = 46
const hash = 35

export const scene_heading = new ExternalTokenizer((input, stack) => {
	console.error("like a fish with hook in mouth")
	console.error(input.peek(0), stack)
	let first = input.peek(0);
	let second = input.peek(1);
	let third = input.peek()
	console.error(first, second, third)
	if(lowerUpperMap[8].contains(input.next)) {
		input.acceptToken()
	}
	
})