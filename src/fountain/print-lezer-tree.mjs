"use strict";
// MIT License
// 
// Copyright (c) 2021 Matthijs Steen
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
exports.__esModule = true;
exports.logTree = exports.printTree = exports.validateTree = exports.validatorTraversal = exports.traverseTree = exports.isType = exports.sliceType = void 0;
var state_1 = require("@codemirror/state");
var common_1 = require("@lezer/common");
var StringInput = /** @class */ (function () {
    function StringInput(input) {
        this.input = input;
        this.lineChunks = false;
    }
    Object.defineProperty(StringInput.prototype, "length", {
        get: function () {
            return this.input.length;
        },
        enumerable: false,
        configurable: true
    });
    StringInput.prototype.chunk = function (from) {
        return this.input.slice(from);
    };
    StringInput.prototype.read = function (from, to) {
        return this.input.slice(from, to);
    };
    return StringInput;
}());
function sliceType(cursor, input, type) {
    if (cursor.type.id === type) {
        var s = input.read(cursor.from, cursor.to);
        cursor.nextSibling();
        return s;
    }
    return null;
}
exports.sliceType = sliceType;
function isType(cursor, type) {
    var cond = cursor.type.id === type;
    if (cond)
        cursor.nextSibling();
    return cond;
}
exports.isType = isType;
function cursorNode(_a, isLeaf) {
    var type = _a.type, from = _a.from, to = _a.to;
    if (isLeaf === void 0) { isLeaf = false; }
    return { type: type, from: from, to: to, isLeaf: isLeaf };
}
function traverseTree(cursor, _a) {
    var _b = _a.from, from = _b === void 0 ? -Infinity : _b, _c = _a.to, to = _c === void 0 ? Infinity : _c, _d = _a.includeParents, includeParents = _d === void 0 ? false : _d, beforeEnter = _a.beforeEnter, onEnter = _a.onEnter, onLeave = _a.onLeave;
    //@ts-ignore
    if (!(cursor instanceof common_1.TreeCursor))
        cursor = cursor instanceof common_1.Tree ? cursor.cursor() : cursor.cursor;
    for (;;) {
        //@ts-ignore
        var node = cursorNode(cursor);
        var leave = false;
        if (node.from <= to && node.to >= from) {
            var enter = !node.type.isAnonymous && (includeParents || (node.from >= from && node.to <= to));
            //@ts-ignore
            if (enter && beforeEnter)
                beforeEnter(cursor);
            //@ts-ignore
            node.isLeaf = !cursor.firstChild();
            if (enter) {
                leave = true;
                if (onEnter(node) === false)
                    return;
            }
            if (!node.isLeaf)
                continue;
        }
        for (;;) {
            //@ts-ignore
            node = cursorNode(cursor, node.isLeaf);
            if (leave && onLeave)
                if (onLeave(node) === false)
                    return;
            leave = cursor.type.isAnonymous;
            node.isLeaf = false;
            //@ts-ignore
            if (cursor.nextSibling())
                break;
            //@ts-ignore
            if (!cursor.parent())
                return;
            leave = true;
        }
    }
}
exports.traverseTree = traverseTree;
function isChildOf(child, parent) {
    return (child.from >= parent.from && child.from <= parent.to && child.to <= parent.to && child.to >= parent.from);
}
function validatorTraversal(input, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.fullMatch, fullMatch = _c === void 0 ? true : _c;
    if (typeof input === "string")
        input = new StringInput(input);
    var state = {
        valid: true,
        parentNodes: [],
        lastLeafTo: 0
    };
    return {
        state: state,
        traversal: {
            onEnter: function (node) {
                state.valid = true;
                if (!node.isLeaf)
                    state.parentNodes.unshift(node);
                if (node.from > node.to || node.from < state.lastLeafTo) {
                    state.valid = false;
                }
                else if (node.isLeaf) {
                    if (state.parentNodes.length && !isChildOf(node, state.parentNodes[0]))
                        state.valid = false;
                    state.lastLeafTo = node.to;
                }
                else {
                    if (state.parentNodes.length) {
                        if (!isChildOf(node, state.parentNodes[0]))
                            state.valid = false;
                    }
                    else if (fullMatch && (node.from !== 0 || node.to !== input.length)) {
                        state.valid = false;
                    }
                }
            },
            onLeave: function (node) {
                if (!node.isLeaf)
                    state.parentNodes.shift();
            }
        }
    };
}
exports.validatorTraversal = validatorTraversal;
function validateTree(tree, input, options) {
    var _a = validatorTraversal(input, options), state = _a.state, traversal = _a.traversal;
    traverseTree(tree, traversal);
    return state.valid;
}
exports.validateTree = validateTree;
var Color;
(function (Color) {
    Color[Color["Red"] = 31] = "Red";
    Color[Color["Green"] = 32] = "Green";
    Color[Color["Yellow"] = 33] = "Yellow";
})(Color || (Color = {}));
function colorize(value, color) {
    return "\u001b[" + color + "m" + String(value) + "\u001b[39m";
}
function printTree(cursor, input, _a) {
    var _b = _a === void 0 ? {} : _a, from = _b.from, to = _b.to, _c = _b.start, start = _c === void 0 ? 0 : _c, includeParents = _b.includeParents;
    var inp = typeof input === "string" ? new StringInput(input) : input;
    var text = state_1.Text.of(inp.read(0, inp.length).split("\n"));
    var state = {
        output: "",
        prefixes: [],
        hasNextSibling: false
    };
    var validator = validatorTraversal(inp);
    traverseTree(cursor, {
        from: from,
        to: to,
        includeParents: includeParents,
        beforeEnter: function (cursor) {
            state.hasNextSibling = cursor.nextSibling() && cursor.prevSibling();
        },
        onEnter: function (node) {
            validator.traversal.onEnter(node);
            var isTop = state.output === "";
            var hasPrefix = !isTop || node.from > 0;
            if (hasPrefix) {
                state.output += (!isTop ? "\n" : "") + state.prefixes.join("");
                if (state.hasNextSibling) {
                    state.output += " ├─ ";
                    state.prefixes.push(" │  ");
                }
                else {
                    state.output += " └─ ";
                    state.prefixes.push("    ");
                }
            }
            var hasRange = node.from !== node.to;
            state.output +=
                (node.type.isError || !validator.state.valid ? colorize(node.type.name, Color.Red) : node.type.name) +
                    " " +
                    (hasRange
                        ? "[" +
                            colorize(locAt(text, start + node.from), Color.Yellow) +
                            ".." +
                            colorize(locAt(text, start + node.to), Color.Yellow) +
                            "]"
                        : colorize(locAt(text, start + node.from), Color.Yellow));
            if (hasRange && node.isLeaf) {
                state.output += ": " + colorize(JSON.stringify(inp.read(node.from, node.to)), Color.Green);
            }
        },
        onLeave: function (node) {
            validator.traversal.onLeave(node);
            state.prefixes.pop();
        }
    });
    return state.output;
}
exports.printTree = printTree;
function locAt(text, pos) {
    var line = text.lineAt(pos);
    return line.number + ":" + (pos - line.from);
}
function logTree(tree, input, options) {
    console.log(printTree(tree, input, options));
}
exports.logTree = logTree;
