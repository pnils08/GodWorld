#!/usr/bin/env node
/**
 * scripts/buildNarrativeBridge.js
 * 
 * Synthesizes raw simulation data into "Story Hooks" and "Editorial Themes".
 * Acts as the "Director's Notes" for the Sift and Reporter agents.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Constants
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'output');

/**
 * Story Formulas: Logical links between raw metrics.
 */
function synthesize(cycle, data) {
    const { riley, sports, weather, ledger, neighborhoods } = data;

    // 1. Identify the "City Pulse"
    const sentiment = parseFloat(riley.CitySentiment || 0);
    const retail = parseFloat(riley.RetailLoad || 0);
    const tone = sentiment > 0.5 ? 'Optimistic' : (sentiment < 0.2 ? 'Anxious' : 'Stable');
    const holiday = riley.HolidayFlag || 'Standard';

    // 2. Identify the Narrative "Main Character" and their Neighborhood
    // For now we hardcode the Vinnie/Rockridge logic, but this would be dynamic
    const primaryPlayer = "Vinnie Keane";
    const primaryNeighborhood = "Rockridge";
    const playerImpact = ledger.find(p => p.Name === primaryPlayer);
    
    // 3. The "Story Synthesis" - The Actual Bridge
    let theme = "Oakland: The Daily Grind";
    let synthesis = "The city continues its steady rhythm.";
    let causalLink = "Normal cycle-to-cycle variance.";
    let neighborhoodFocus = "Chinatown"; // Default rotation
    let stageDirection = "Focus on the quiet resilience of the neighborhood.";

    // FORMULA: The "Keane Effect" (Sports Legend + Home Neighborhood)
    if (primaryPlayer === "Vinnie Keane" && playerImpact?.Status === "Active") {
        const rockridge = neighborhoods.find(n => n.Neighborhood === "Rockridge");
        if (parseFloat(rockridge?.RetailVitality || 0) > 13) {
            theme = "The Rockridge Pilgrimage";
            neighborhoodFocus = "Rockridge";
            synthesis = `Retail in ${neighborhoodFocus} is surging as fans gather to celebrate ${primaryPlayer}'s final season.`;
            causalLink = `Individual legacy (${primaryPlayer}) is overriding broader city trends, anchoring economic hope in ${neighborhoodFocus}.`;
            stageDirection = "Reporters should capture the 'farewell' atmosphere; every beer poured in Rockridge is a toast to Vinnie.";
        }
    }

    // FORMULA: The "Holiday Omen"
    if (holiday === 'Halloween' && !sports[0]?.Streak?.startsWith('W')) {
        theme = "Halloween Omens";
        synthesis = "The festive mood is tinged with anxiety as the A's struggle to find their rhythm.";
        causalLink = "The contrast between the spooky season celebrations and the cold bats on the field is creating a 'nervous festive' atmosphere.";
        stageDirection = "Write with a 'dark-holiday' aesthetic; the fog feels heavier because the wins are harder to find.";
    }

    return {
        Cycle: cycle,
        Cycle_Theme: theme,
        City_Tone: `${tone}-${holiday}`,
        Lead_Synthesis: synthesis,
        Causal_Link: causalLink,
        Neighborhood_Focus: neighborhoodFocus,
        Key_Players: sports[0]?.relatedCitizens || "Vinnie Keane, Mike Paulson",
        Stage_Direction: stageDirection,
        Data_Anchors: `Retail: ${retail}, Sentiment: ${sentiment}`
    };
}

// Main execution for CLI use
async function run() {
    const cycle = process.argv[2] || '96';
    
    // Mocking the data fetch (In production, this reads from sheets.js)
    const data = {
        riley: { CitySentiment: 0.59, RetailLoad: 1.56, HolidayFlag: 'Halloween' },
        sports: [{ StoryAngle: "A's lose series", Streak: "L2", relatedCitizens: "Vinnie Keane, Travis Coles" }],
        ledger: [{ Name: "Vinnie Keane", Status: "Active" }],
        neighborhoods: [{ Neighborhood: "Rockridge", RetailVitality: 14.49 }]
    };

    const bridgeRow = synthesize(cycle, data);

    console.log("\n=== NARRATIVE BRIDGE SYNTHESIS ===");
    console.log(JSON.stringify(bridgeRow, null, 2));

    // Save locally for the next turn
    const bridgePath = path.join(OUTPUT_DIR, `narrative_bridge_c${cycle}.json`);
    fs.writeFileSync(bridgePath, JSON.stringify(bridgeRow, null, 2));
    console.log(`\nLocal bridge snapshot saved to: ${bridgePath}`);
}

if (require.main === module) {
    run();
}
