"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require('fs');
const xml2js = require('xml2js');
const methodName = 'retrieveJWT';
const fileName = './auth.cs';
function Combiner() {
    return __awaiter(this, void 0, void 0, function* () {
        const xmlObject = yield generateXmlObj();
        const locators = yield findValueLocators();
        const paths = locators.map((loc) => {
            const value = getValueByLocator(xmlObject, loc);
            if (isCsharpPath(value)) {
                console.log(`before: ${value}`);
                const fileName = getFilePath(value);
                const methodName = getMethodName(value);
                const code = `@{` + getCode(fileName, methodName) + `}`;
                console.log(fileName);
                console.log(methodName);
                updateValueByLocator(xmlObject, loc, code);
            }
            return value;
        });
        console.log(paths);
        // Convert the XML object back to an XML string
        const builder = new xml2js.Builder();
        const combinedXmlString = builder.buildObject(xmlObject);
        // Write the combined XML to a file
        fs.writeFileSync('./result.xml', combinedXmlString);
        console.log("from within combiner function");
        // Get the path to the C# code file from the XML file
        // TODO: find <value> section automatically
        // const csharpFilePath = xmlObject.policies.inbound[0]['set-header'][0].value[0]
        // const csharpCode = fs.readFileSync(require.resolve(csharpFilePath), 'utf-8');
        // const methodCode = getMethodCode(csharpCode);
        // // Embed the C# code into the XML file
        // // xmlObject.policies.inbound[0]['set-header'].value = { methodCode };
        // xmlObject.policies.inbound[0]['set-header'][0].value[0] = `@{`+methodCode+`}`
        // // Convert the XML object back to an XML string
        // const builder = new xml2js.Builder();
        // const combinedXmlString = builder.buildObject(xmlObject);
        // // Write the combined XML to a file
        // fs.writeFileSync('./result.xml', combinedXmlString);
        // console.log("from within combiner function")
    });
}
function getCode(fileName, methodName) {
    const csharpCode = fs.readFileSync(require.resolve(fileName), 'utf-8');
    // Extract the method code
    const methodRegex = new RegExp(`(?<=\\b${methodName}\\b\\s*\\([^)]*\\)\\s*\\{)[^{}]*(?:\\{[^{}]*\\}[^{}]*)*(?=})`);
    const methodMatch = csharpCode.match(methodRegex);
    console.log(methodMatch[0]);
    if (!methodMatch) {
        console.error(`Method "${methodName}" not found in file "${fileName}"`);
        process.exit(1);
    }
    return methodMatch ? methodMatch[0] : null;
}
function findValueLocators() {
    return __awaiter(this, void 0, void 0, function* () {
        const xmlObject = yield generateXmlObj();
        const locators = [];
        const stack = [{ node: xmlObject, locator: '' }];
        while (stack.length > 0) {
            const { node, locator } = stack.pop();
            for (const key in node) {
                const value = node[key];
                const childLocator = `${locator}.${key}`;
                if (key == 'value') {
                    locators.push(transformLocatorString(childLocator));
                }
                else if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        stack.push({ node: value[i], locator: `${childLocator}[${i}]` });
                    }
                }
                else if (typeof value === 'object') {
                    stack.push({ node: value, locator: childLocator });
                }
            }
        }
        console.log(locators);
        return locators;
    });
}
// tested
function getValueByLocator(xmlObject, locator) {
    if (!xmlObject) {
        return undefined;
    }
    const keys = locator.split('.').map((key) => {
        if (key.endsWith(']')) {
            const [name, index] = key.slice(0, -1).split('[');
            return { name, index: parseInt(index) };
        }
        else {
            return { name: key };
        }
    });
    return keys.reduce((node, { name, index }) => {
        if (!node || node[name] === undefined) {
            return undefined;
        }
        if (index !== undefined) {
            return node[name][index];
        }
        else {
            return node[name];
        }
    }, xmlObject);
}
// tested
function updateValueByLocator(xmlObject, locator, newValue) {
    const keys = locator.split('.').map((key) => {
        if (key.endsWith(']')) {
            const [name, index] = key.slice(0, -1).split('[');
            return { name, index: parseInt(index) };
        }
        else {
            return { name: key };
        }
    });
    const finalKey = keys.pop();
    if (!finalKey || !finalKey.name) {
        return;
    }
    const node = keys.reduce((node, { name, index }) => {
        if (!node || node[name] === undefined) {
            return undefined;
        }
        if (index !== undefined) {
            return node[name][index];
        }
        else {
            return node[name];
        }
    }, xmlObject);
    if (node && node[finalKey.name] !== undefined) {
        if (finalKey.index !== undefined) {
            node[finalKey.name][finalKey.index] = newValue;
        }
        else {
            node[finalKey.name] = newValue;
        }
    }
}
function isCsharpPath(value) {
    return value.startsWith('@{') && value.endsWith('}');
}
function getFilePath(value) {
    var fileNameMethod = value.replace('@{', '');
    fileNameMethod = fileNameMethod.replace('}', '');
    return fileNameMethod.split(' ')[0];
}
function getMethodName(value) {
    var fileNameMethod = value.replace('@{', '');
    fileNameMethod = fileNameMethod.replace('}', '');
    return fileNameMethod.split(' ')[1];
}
function generateXmlObj() {
    return __awaiter(this, void 0, void 0, function* () {
        const xmlString = fs.readFileSync(require.resolve('../source/policy.xml'), 'utf-8');
        return yield xml2js.parseStringPromise(xmlString);
    });
}
function transformLocatorString(locator) {
    if (locator.startsWith('.')) {
        locator = locator.substring(1);
    }
    return `${locator}[0]`;
}
Combiner();
