/*
Copyright 2019-2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Mjolnir } from "../Mjolnir";
import { extractRequestError, LogService, RichReply } from "matrix-bot-sdk";
import { PROTECTIONS } from "../protections/protections";

// !mjolnir enable <protection>
export async function execEnableProtection(roomId: string, event: any, mjolnir: Mjolnir, parts: string[]) {
    try {
        await mjolnir.enableProtection(parts[2]);
        await mjolnir.client.unstableApis.addReactionToEvent(roomId, event['event_id'], '✅');
    } catch (e) {
        LogService.error("ProtectionsCommands", extractRequestError(e));

        const message = `Error enabling protection '${parts[0]}' - check the name and try again.`;
        const reply = RichReply.createFor(roomId, event, message, message);
        reply["msgtype"] = "m.notice";
        await mjolnir.client.sendMessage(roomId, reply);
    }
}

export async function execSetProtection(roomId: string, event: any, mjolnir: Mjolnir, parts: string[]) {
    const [protectionName, ...settingParts] = parts[2].split(".");
    const protection = PROTECTIONS[protectionName];
    if (protection !== undefined) {
        const defaultSettings = protection.factory().settings
        const settingName = settingParts[0];
        const value = parts[3];

        let newSettings: { [settingName: string]: any } = {}
        let settingInt = 0;

        let message = "did nothing";

        if (defaultSettings[settingName] === undefined) {
            message = `Unknown setting ${settingName}`;
        } else if (typeof(defaultSettings[settingName]) === 'number'
                && (settingInt = parseInt(value, 10)) !== NaN) {
            newSettings[settingName] = settingInt;
        } else {
            message = `Type mismatch (should be ${typeof(defaultSettings[settingName])})`;
        }

        if (Object.keys(newSettings).length > 0) {
            await mjolnir.setProtectionSettings(protectionName, newSettings);
            message = `Changed ${protectionName}.${settingName} to ${value}`;
        }
        const reply = RichReply.createFor(roomId, event, message, message);
        reply["msgtype"] = "m.notice";
        await mjolnir.client.sendMessage(roomId, reply);
    }
}

// !mjolnir disable <protection>
export async function execDisableProtection(roomId: string, event: any, mjolnir: Mjolnir, parts: string[]) {
    await mjolnir.disableProtection(parts[2]);
    await mjolnir.client.unstableApis.addReactionToEvent(roomId, event['event_id'], '✅');
}

// !mjolnir protections
export async function execListProtections(roomId: string, event: any, mjolnir: Mjolnir, parts: string[]) {
    const possibleProtections = Object.keys(PROTECTIONS);
    const enabledProtections = mjolnir.enabledProtections.map(p => p.name);

    let html = "Available protections:<ul>";
    let text = "Available protections:\n";

    for (const protection of possibleProtections) {
        const emoji = enabledProtections.includes(protection) ? '🟢 (enabled)' : '🔴 (disabled)';
        html += `<li>${emoji} <code>${protection}</code> - ${PROTECTIONS[protection].description}</li>`;
        text += `* ${emoji} ${protection} - ${PROTECTIONS[protection].description}\n`;
    }

    html += "</ul>";

    const reply = RichReply.createFor(roomId, event, text, html);
    reply["msgtype"] = "m.notice";
    await mjolnir.client.sendMessage(roomId, reply);
}
