// ==========================================================
// TEAM A vs TEAM B CRICKET SCOREBOARD - TWO-INNINGS ENGINE
// ==========================================================

// Global state holding current match information
let matchState = {
    opponentTeam: "Team B",
    currentInnings: 1, // 1 = Team A Batting, 2 = Team B Batting
    activeViewTab: 1,  // Tab currently being viewed (1 or 2)
    innings1Completed: false,
    innings2Completed: false,
    target: null,      // Target to chase (Innings 1 runs + 1)
    
    // Separate, unmerged squad rosters
    squadUs: [
        { name: "Ashok", role: "All-Rounder", batted: true },
        { name: "Batsman 2", role: "Batsman", batted: true }
    ],
    squadThem: [
        { name: "Opp Batter 1", role: "Batsman", batted: true },
        { name: "Opp Batter 2", role: "Batsman", batted: true },
        { name: "Bowler 1", role: "Bowler", batted: false },
        { name: "Bowler 2", role: "Bowler", batted: false },
        { name: "Bowler 3", role: "Bowler", batted: false }
    ],
    
    // Innings 1 (Team A Batting, Team B Bowling)
    innings1: {
        runs: 0,
        wickets: 0,
        overs: 0,
        ballsInOver: 0,
        totalValidBalls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0 },
        players: {
            bat1: { name: "Ashok", runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true },
            bat2: { name: "Batsman 2", runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: false },
            bowler: { name: "Bowler 1", overs: "0.0", balls: 0, runs: 0, wickets: 0 }
        },
        currentOverBalls: [],
        battingStats: [
            { name: "Ashok", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true },
            { name: "Batsman 2", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true }
        ],
        bowlingStats: [
            { name: "Bowler 1", oversWhole: 0, oversBalls: 0, runs: 0, wickets: 0, active: true }
        ]
    },
    
    // Innings 2 (Team B Batting, Team A Bowling)
    innings2: {
        runs: 0,
        wickets: 0,
        overs: 0,
        ballsInOver: 0,
        totalValidBalls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0 },
        players: {
            bat1: { name: "Opp Batter 1", runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true },
            bat2: { name: "Opp Batter 2", runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: false },
            bowler: { name: "Ashok", overs: "0.0", balls: 0, runs: 0, wickets: 0 }
        },
        currentOverBalls: [],
        battingStats: [
            { name: "Opp Batter 1", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true },
            { name: "Opp Batter 2", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true }
        ],
        bowlingStats: [
            { name: "Ashok", oversWhole: 0, oversBalls: 0, runs: 0, wickets: 0, active: true }
        ]
    }
};

// Undo stack to store snapshot backups of the matchState
let stateHistory = [];
let currentWicketStrikerSlot = null; // bat1 or bat2 replacement tracker

// Temporary global variables for Wicket Dismissal detail capturing
let tempWicketStriker = null;
let tempWicketBowler = null;
let tempWicketSlot = null;

// Temporary variable holding the match currently loaded in the history detail modal
let loadedHistoryMatch = null;
let loadedHistoryActiveTab = 1;

// ==========================================================
// STATE CONTROLLER ACCESSORS
// ==========================================================

function getActiveInnings() {
    return matchState.currentInnings === 1 ? matchState.innings1 : matchState.innings2;
}

function getViewingInnings() {
    return matchState.activeViewTab === 1 ? matchState.innings1 : matchState.innings2;
}

function getBattingSquad() {
    return matchState.currentInnings === 1 ? matchState.squadUs : matchState.squadThem;
}

function getBowlingSquad() {
    return matchState.currentInnings === 1 ? matchState.squadThem : matchState.squadUs;
}

// ==========================================================
// INITIALIZATION & RENDER
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
    loadSavedMatches();
    resetState();
});

// Resets state variables to a clean match starting point
// Global Roster Builders for Setup Registration Screen
let setupSquadA = [];
let setupSquadB = [];

function syncTossWinnerSelectLabels() {
    const teamAName = document.getElementById('setup-team-a-name').value.trim() || "Team A";
    const teamBName = document.getElementById('setup-team-b-name').value.trim() || "Team B";
    
    const select = document.getElementById('setup-toss-winner');
    if (select) {
        select.options[0].textContent = teamAName;
        select.options[1].textContent = teamBName;
    }
}

function resetState(startFresh = false) {
    if (startFresh) {
        setupSquadA = [
            { name: "", role: "Batsman" },
            { name: "", role: "Batsman" }
        ];

        setupSquadB = [
            { name: "", role: "Batsman" },
            { name: "", role: "Batsman" }
        ];
    } else {
        setupSquadA = [
            { name: "Ashok", role: "All-Rounder" },
            { name: "Batsman 2", role: "Batsman" },
            { name: "Player 3", role: "Batsman" },
            { name: "Player 4", role: "Batsman" },
            { name: "Player 5", role: "All-Rounder" }
        ];

        setupSquadB = [
            { name: "Opp Batter 1", role: "Batsman" },
            { name: "Opp Batter 2", role: "Batsman" },
            { name: "Bowler 1", role: "Bowler" },
            { name: "Bowler 2", role: "Bowler" },
            { name: "Bowler 3", role: "Bowler" }
        ];
    }

    stateHistory = []; // clear undo stack
    
    // Reset Setup inputs to defaults
    document.getElementById('setup-overs').value = "6";
    
    if (startFresh) {
        document.getElementById('setup-team-a-name').value = "";
        document.getElementById('setup-team-b-name').value = "";
    } else {
        document.getElementById('setup-team-a-name').value = "Team A";
        document.getElementById('setup-team-b-name').value = "Team B";
    }
    
    document.getElementById('setup-toss-winner').value = "a";
    document.getElementById('setup-toss-decision').value = "bat";
    
    // Reveal Setup screen & hide live dashboard
    document.getElementById('match-setup-screen').classList.remove('hidden');
    document.getElementById('scoreboard-dashboard').classList.add('hidden');
    
    syncTossWinnerSelectLabels();
    renderSetupSquads();
}

// Deep copies the current state to save in the history stack
function saveStateSnapshot() {
    stateHistory.push(JSON.parse(JSON.stringify(matchState)));
    updateUndoButtonState();
}

function updateUndoButtonState() {
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.disabled = stateHistory.length === 0;
    }
}

// Reverts to the previous recorded state
function undoLastBall() {
    if (stateHistory.length > 0) {
        matchState = stateHistory.pop();
        updateUndoButtonState();
        renderSquadGrid();
        renderScoreboard();
    }
}

// ==========================================================
// LIVE SCORING ACTIONS
// ==========================================================

// Handles standard runs: 0, 1, 2, 3, 4, 6
function addScore(runsScored) {
    saveStateSnapshot();
    
    const inn = getActiveInnings();
    
    // 1. Update team total runs
    inn.runs += runsScored;
    
    // 2. Update Active striker stats (crease display)
    const activeStriker = getActiveStriker();
    if (activeStriker) {
        activeStriker.runs += runsScored;
        activeStriker.balls += 1;
        if (runsScored === 4) activeStriker.fours += 1;
        if (runsScored === 6) activeStriker.sixes += 1;
        
        // Update persistent batting scorecard
        const persistentStriker = getPersistentBatter(activeStriker.name);
        if (persistentStriker) {
            persistentStriker.runs += runsScored;
            persistentStriker.balls += 1;
            if (runsScored === 4) persistentStriker.fours += 1;
            if (runsScored === 6) persistentStriker.sixes += 1;
        }
    }
    
    // 3. Update Bowler stats (crease display)
    inn.players.bowler.runs += runsScored;
    inn.players.bowler.balls += 1;
    
    // Update persistent bowler scorecard
    const activeBowler = getActiveBowler();
    if (activeBowler) {
        activeBowler.runs += runsScored;
        activeBowler.oversBalls += 1;
    }
    
    // 4. Update ball tracking in the over
    let ballLabel = runsScored === 0 ? "•" : runsScored.toString();
    inn.currentOverBalls.push({ label: ballLabel, type: runsScored === 4 ? "four" : runsScored === 6 ? "six" : "runs" });
    
    // 5. Progress over delivery
    progressBall();
    
    // 6. Rotate strike on odd runs (1, 3)
    if (runsScored % 2 !== 0) {
        rotateStrike();
    }
    
    renderScoreboard();
    checkMatchCompletion();
}

// Handles extras: Wides, No-Balls, Byes
function addExtra(type) {
    saveStateSnapshot();
    
    const inn = getActiveInnings();
    const activeBowler = getActiveBowler();
    
    if (type === 'wd') {
        inn.runs += 1;
        inn.extras.wides += 1;
        inn.players.bowler.runs += 1;
        inn.currentOverBalls.push({ label: "Wd", type: "extra" });
        
        if (activeBowler) {
            activeBowler.runs += 1;
        }
    } 
    else if (type === 'nb') {
        inn.runs += 1;
        inn.extras.noBalls += 1;
        inn.players.bowler.runs += 1;
        inn.currentOverBalls.push({ label: "Nb", type: "extra" });
        
        if (activeBowler) {
            activeBowler.runs += 1;
        }
    } 
    else if (type === 'bye') {
        inn.runs += 1;
        inn.extras.byes += 1;
        
        const activeStriker = getActiveStriker();
        if (activeStriker) {
            activeStriker.balls += 1;
            
            const persistentStriker = getPersistentBatter(activeStriker.name);
            if (persistentStriker) {
                persistentStriker.balls += 1;
            }
        }
        
        inn.players.bowler.balls += 1;
        inn.currentOverBalls.push({ label: "B", type: "extra" });
        
        if (activeBowler) {
            activeBowler.oversBalls += 1;
        }
        
        progressBall();
        rotateStrike(); // Strike rotates on a single bye
    }
    
    renderScoreboard();
    checkMatchCompletion();
}

// Handles wickets fallen (opens namma dismissal capture overlay modal!)
function triggerWicket() {
    const inn = getActiveInnings();
    const maxWickets = getBattingSquad().length - 1;
    if (inn.wickets >= maxWickets) return; // All out!
    
    const activeStriker = getActiveStriker();
    if (!activeStriker) return;
    
    // Capture temporary details before modal choices
    tempWicketStriker = activeStriker.name;
    tempWicketBowler = inn.players.bowler.name;
    if (inn.players.bat1.name === activeStriker.name) {
        tempWicketSlot = 'bat1';
    } else {
        tempWicketSlot = 'bat2';
    }
    
    // Reset modal active selections
    const modalButtons = document.querySelectorAll('.btn-dismissal-type');
    modalButtons.forEach(btn => btn.classList.remove('active'));
    
    // Reset modal and display
    document.getElementById('fielder-selection-container').classList.add('hidden');
    document.getElementById('dismissal-modal').classList.remove('hidden');
}

function selectDismissalType(type) {
    // Toggle active class on dismissal type buttons for visual selection feedback!
    const modalButtons = document.querySelectorAll('.btn-dismissal-type');
    modalButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
        }
    });

    if (type === 'bowled') {
        const dismissalText = `b. ${tempWicketBowler}`;
        confirmWicket(dismissalText, false); // Bowler gets wicket credit!
    } else if (type === 'lbw') {
        const dismissalText = `lbw b. ${tempWicketBowler}`;
        confirmWicket(dismissalText, false); // Bowler gets wicket credit!
    } else if (type === 'hitwicket') {
        const dismissalText = `hit wicket b. ${tempWicketBowler}`;
        confirmWicket(dismissalText, false); // Bowler gets wicket credit!
    } else if (type === 'caught' || type === 'runout' || type === 'stumped') {
        // Populate and display bowling team fielding list
        const listContainer = document.getElementById('modal-fielder-list');
        if (listContainer) {
            listContainer.innerHTML = "";
            const squad = getBowlingSquad();
            squad.forEach(player => {
                const item = document.createElement('div');
                item.className = "roster-select-item";
                item.innerHTML = `
                    <div class="roster-select-info">
                        <span class="roster-select-name">${player.name}</span>
                    </div>
                `;
                item.onclick = () => {
                    let dismissalText = "";
                    if (type === 'caught') {
                        dismissalText = `c. ${player.name} b. ${tempWicketBowler}`;
                        confirmWicket(dismissalText, false); // Bowler gets wicket credit!
                    } else if (type === 'stumped') {
                        dismissalText = `st. ${player.name} b. ${tempWicketBowler}`;
                        confirmWicket(dismissalText, false); // Bowler gets wicket credit!
                    } else {
                        dismissalText = `ro. ${player.name}`;
                        confirmWicket(dismissalText, true); // Bowler does NOT get wicket credit!
                    }
                };
                listContainer.appendChild(item);
            });
            document.getElementById('fielder-selection-container').classList.remove('hidden');
        }
    }
}

function confirmWicket(dismissalText, isRunOut) {
    document.getElementById('dismissal-modal').classList.add('hidden');
    
    saveStateSnapshot();
    
    const inn = getActiveInnings();
    inn.wickets += 1;
    
    // Bowler wickets credit update
    if (!isRunOut) {
        inn.players.bowler.wickets += 1;
        const activeBowler = getActiveBowler();
        if (activeBowler) {
            activeBowler.wickets += 1;
        }
    }
    
    // Increment bowler ball count
    inn.players.bowler.balls += 1;
    const activeBowler = getActiveBowler();
    if (activeBowler) {
        activeBowler.oversBalls += 1;
    }
    
    inn.currentOverBalls.push({ label: "W", type: "wicket" });
    
    // Wicketed striker batsman crease stats update
    const activeStriker = getActiveStriker();
    if (activeStriker) {
        activeStriker.balls += 1;
        activeStriker.onStrike = false; // off strike
        
        // Update persistent batsman stats as Dismissed
        const persistentStriker = getPersistentBatter(activeStriker.name);
        if (persistentStriker) {
            persistentStriker.balls += 1;
            persistentStriker.out = true;
            persistentStriker.active = false;
            persistentStriker.dismissal = dismissalText; // Store short form!
        }
    }
    
    // Assign crease slot for replacement batsman
    currentWicketStrikerSlot = tempWicketSlot;
    
    progressBall();
    renderScoreboard();
    
    // Check all-out
    const maxWickets = getBattingSquad().length - 1;
    if (inn.wickets >= maxWickets) {
        checkMatchCompletion();
    } else {
        openWicketModal();
    }
    
    // Clear temp values
    tempWicketStriker = null;
    tempWicketBowler = null;
    tempWicketSlot = null;
}

function cancelDismissal() {
    document.getElementById('dismissal-modal').classList.add('hidden');
    
    // Reset modal active selections
    const modalButtons = document.querySelectorAll('.btn-dismissal-type');
    modalButtons.forEach(btn => btn.classList.remove('active'));
    
    // Clear temp values
    tempWicketStriker = null;
    tempWicketBowler = null;
    tempWicketSlot = null;
}

// Wicket modal list generator
function openWicketModal() {
    const listContainer = document.getElementById('modal-roster-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    const squad = getBattingSquad();
    
    // Find unbatted squad members
    const unbatted = squad.filter(player => !player.batted);
    
    if (unbatted.length === 0) {
        // Fallback prompt if roster runs out
        const inn = getActiveInnings();
        let nextNumber = inn.wickets + 2;
        let newName = prompt(`Wicket! Enter name for Batsman ${nextNumber}:`, `Batsman ${nextNumber}`);
        selectNewBatsman({ name: newName || `Batsman ${nextNumber}` });
        return;
    }
    
    unbatted.forEach(player => {
        const item = document.createElement('div');
        item.className = "roster-select-item";
        
        let roleClass = "role-batsman";
        if (player.role === "Bowler") roleClass = "role-bowler";
        else if (player.role === "All-Rounder") roleClass = "role-allrounder";
        
        item.innerHTML = `
            <div class="roster-select-info">
                <span class="roster-select-name">${player.name}</span>
            </div>
            <span class="roster-select-role ${roleClass}">${player.role || 'Batsman'}</span>
        `;
        
        item.onclick = () => {
            player.batted = true;
            selectNewBatsman(player);
        };
        
        listContainer.appendChild(item);
    });
    
    document.getElementById('wicket-modal').classList.remove('hidden');
}

function selectNewBatsman(player) {
    const inn = getActiveInnings();
    if (currentWicketStrikerSlot === 'bat1') {
        inn.players.bat1 = { name: player.name, runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true };
    } else {
        inn.players.bat2 = { name: player.name, runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true };
    }
    
    // Add player to persistent batting scorecard as active
    inn.battingStats.push({
        name: player.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        active: true
    });
    
    closeWicketModal();
    renderScoreboard();
    checkMatchCompletion();
}

function closeWicketModal() {
    document.getElementById('wicket-modal').classList.add('hidden');
}

// Progresses ball counts and overs completion (6 valid balls)
function progressBall() {
    const inn = getActiveInnings();
    inn.ballsInOver += 1;
    inn.totalValidBalls += 1;
    
    // Update bowler overs display fractional representation
    let bowlerBalls = inn.players.bowler.balls;
    let bowlerOversWhole = Math.floor(bowlerBalls / 6);
    let bowlerBallsLeft = bowlerBalls % 6;
    inn.players.bowler.overs = `${bowlerOversWhole}.${bowlerBallsLeft}`;
    
    // Check if over is completed
    if (inn.ballsInOver === 6) {
        inn.overs += 1;
        inn.ballsInOver = 0;
        inn.currentOverBalls = []; // Clear over balls tracker
        
        // Rotate strike at the end of the over
        rotateStrike();
        
        // ONLY prompt for bowler change if this was NOT the final ball of the innings!
        let totalBallsInn = (inn.overs * 6) + inn.ballsInOver;
        let maxBalls = matchMaxOvers * 6;
        const maxWickets = getBattingSquad().length - 1;
        
        const isCompleted = inn.wickets >= maxWickets || totalBallsInn >= maxBalls;
        
        if (!isCompleted) {
            // Trigger the elegant Bowler Modal selection popup if auto-prompt is enabled!
            const autoBowlerChangeToggle = document.getElementById('toggle-auto-bowler-change');
            const shouldPrompt = autoBowlerChangeToggle ? autoBowlerChangeToggle.checked : true;
            if (shouldPrompt) {
                openBowlerModal();
            }
        }
    }
}

// Bowler selection modal generator
function openBowlerModal() {
    const listContainer = document.getElementById('modal-bowler-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    const inn = getActiveInnings();
    
    // 1. Display Current Bowler Spell Highlight prominently at the top for easy consecutive bowling!
    const currentBowler = inn.players.bowler;
    if (currentBowler && currentBowler.name) {
        // Find existing spell stats if any
        const activeSpell = inn.bowlingStats.find(b => b.name.toLowerCase() === currentBowler.name.toLowerCase());
        const totalBalls = activeSpell ? activeSpell.oversBalls : currentBowler.balls;
        const wholeOvers = Math.floor(totalBalls / 6);
        const ballsLeft = totalBalls % 6;
        const runs = activeSpell ? activeSpell.runs : currentBowler.runs;
        const wickets = activeSpell ? activeSpell.wickets : currentBowler.wickets;
        
        const highlightDiv = document.createElement('div');
        highlightDiv.className = "current-bowler-spell-highlight";
        highlightDiv.style.marginBottom = "16px";
        highlightDiv.style.padding = "14px";
        highlightDiv.style.borderRadius = "var(--radius-lg)";
        highlightDiv.style.display = "flex";
        highlightDiv.style.justifyContent = "space-between";
        highlightDiv.style.alignItems = "center";
        
        highlightDiv.innerHTML = `
            <div style="text-align: left;">
                <span style="margin-bottom: 4px; display: inline-block; font-size: 0.65rem; background: var(--color-blue-glow); color: var(--color-blue); border: 1px solid rgba(59,130,246,0.3); padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">Active Crease Bowler</span>
                <h4 style="font-weight: 700; color: var(--text-main); margin: 0; font-size: 1rem;">${currentBowler.name}</h4>
                <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">Spell: ${wholeOvers}.${ballsLeft} Ov | ${runs} R | ${wickets} Wk</p>
            </div>
            <button class="btn btn-primary btn-sm" style="background: var(--color-blue) !important; border-color: var(--color-blue) !important; padding: 6px 12px; font-size: 0.78rem; border-radius: var(--radius-sm); color: #fff; cursor: pointer; border: none; font-weight: 700;" onclick="selectNewBowler('${currentBowler.name.replace(/'/g, "\\'")}')">
                <i class="fa-solid fa-baseball"></i> Continue Spell
            </button>
        `;
        listContainer.appendChild(highlightDiv);
    }
    
    // 2. Previously Bowled Bowlers (spell resume lists)
    const prevBowlers = inn.bowlingStats.filter(b => b.name.toLowerCase() !== (currentBowler ? currentBowler.name.toLowerCase() : ""));
    if (prevBowlers.length > 0) {
        const sectionTitle = document.createElement('h4');
        sectionTitle.style.fontSize = "0.8rem";
        sectionTitle.style.color = "var(--text-muted)";
        sectionTitle.style.textTransform = "uppercase";
        sectionTitle.style.letterSpacing = "0.5px";
        sectionTitle.style.margin = "12px 0 8px 4px";
        sectionTitle.textContent = "Previously Bowled Bowlers";
        listContainer.appendChild(sectionTitle);
        
        prevBowlers.forEach(b => {
            const item = document.createElement('div');
            item.className = "roster-select-item";
            item.style.borderLeft = "3px solid var(--color-gold)";
            
            let oWhole = Math.floor(b.oversBalls / 6);
            let oLeft = b.oversBalls % 6;
            
            item.innerHTML = `
                <div class="roster-select-info">
                    <span class="roster-select-name">${b.name}</span>
                    <span class="roster-select-meta">Spell: ${oWhole}.${oLeft} Overs | ${b.runs} Runs | ${b.wickets} Wkts</span>
                </div>
                <button class="btn btn-secondary btn-xs" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; cursor: pointer;" onclick="selectNewBowler('${b.name.replace(/'/g, "\\'")}')">Resume spell</button>
            `;
            listContainer.appendChild(item);
        });
    }
       // 3. Display bowlable players inside the squad roster (Exclude players who already bowled)
    const squad = getBowlingSquad();
    const bowlable = squad.filter(player => 
        !inn.bowlingStats.some(b => b.name.toLowerCase() === player.name.toLowerCase())
    );
    
    const sectionTitleRoster = document.createElement('h4');
    sectionTitleRoster.style.fontSize = "0.8rem";
    sectionTitleRoster.style.color = "var(--text-muted)";
    sectionTitleRoster.style.textTransform = "uppercase";
    sectionTitleRoster.style.letterSpacing = "0.5px";
    sectionTitleRoster.style.margin = "18px 0 8px 4px";
    sectionTitleRoster.textContent = "Select New Bowler from Squad";
    listContainer.appendChild(sectionTitleRoster);
    
    if (bowlable.length > 0) {
        bowlable.forEach(player => {
            const item = document.createElement('div');
            item.className = "roster-select-item";
            
            let roleClass = "role-bowler";
            if (player.role === "All-Rounder") roleClass = "role-allrounder";
            else if (player.role === "Batsman") roleClass = "role-batsman";
            
            item.innerHTML = `
                <div class="roster-select-info">
                    <span class="roster-select-name">${player.name}</span>
                </div>
                <span class="roster-select-role ${roleClass}">${player.role || 'Bowler'}</span>
            `;
            
            item.onclick = () => {
                selectNewBowler(player.name);
            };
            
            listContainer.appendChild(item);
        });
    } else {
        // Fallback message if there are no unbowed players left in roster
        const noBowlersMsg = document.createElement('p');
        noBowlersMsg.style.fontSize = "0.78rem";
        noBowlersMsg.style.color = "var(--text-muted)";
        noBowlersMsg.style.margin = "8px 0 8px 4px";
        noBowlersMsg.textContent = "No unbowed players left in the squad.";
        listContainer.appendChild(noBowlersMsg);
    }
    
    document.getElementById('bowler-modal').classList.remove('hidden');
}

function selectNewBowler(bowlerName) {
    saveStateSnapshot();
    
    const inn = getActiveInnings();
    
    // Look up if this bowler already has a spell recorded in persistent stats
    let existingSpell = inn.bowlingStats.find(b => b.name.toLowerCase() === bowlerName.toLowerCase());
    
    // If Bowler 1 bowls a second over, load their cumulative stats to the crease display!
    let cumulativeBalls = existingSpell ? existingSpell.oversBalls : 0;
    let cumulativeWholeOvers = Math.floor(cumulativeBalls / 6);
    let cumulativeBallsLeft = cumulativeBalls % 6;
    let cumulativeOversLabel = `${cumulativeWholeOvers}.${cumulativeBallsLeft}`;
    
    inn.players.bowler = {
        name: bowlerName,
        overs: cumulativeOversLabel,
        balls: cumulativeBalls,
        runs: existingSpell ? existingSpell.runs : 0,
        wickets: existingSpell ? existingSpell.wickets : 0
    };
    
    document.getElementById('bowler-name').value = bowlerName;
    
    // Set all other persistent bowlers to inactive
    inn.bowlingStats.forEach(b => b.active = false);
    
    // Sync/Register in persistent list
    if (existingSpell) {
        existingSpell.active = true;
    } else {
        inn.bowlingStats.push({
            name: bowlerName,
            oversWhole: 0,
            oversBalls: 0,
            runs: 0,
            wickets: 0,
            active: true
        });
    }
    
    closeBowlerModal();
    renderScoreboard();
}

function closeBowlerModal() {
    document.getElementById('bowler-modal').classList.add('hidden');
}

// Rotates strike between batsman 1 and batsman 2
function rotateStrike() {
    const inn = getActiveInnings();
    inn.players.bat1.onStrike = !inn.players.bat1.onStrike;
    inn.players.bat2.onStrike = !inn.players.bat2.onStrike;
}

// Explicitly click a batsman score to set strike
function strikeChange(index) {
    saveStateSnapshot();
    const inn = getActiveInnings();
    if (index === 1) {
        inn.players.bat1.onStrike = true;
        inn.players.bat2.onStrike = false;
    } else {
        inn.players.bat1.onStrike = false;
        inn.players.bat2.onStrike = true;
    }
    renderScoreboard();
}

// Retrieves currently on-strike batsman
function getActiveStriker() {
    const inn = getActiveInnings();
    if (inn.players.bat1.onStrike) return inn.players.bat1;
    if (inn.players.bat2.onStrike) return inn.players.bat2;
    return null;
}

// Synchronizes manual text inputs to state
function updatePlayerNames() {
    const inn = getActiveInnings();
    const bat1Val = document.getElementById('bat1-name').value;
    const bat2Val = document.getElementById('bat2-name').value;
    const bowlerVal = document.getElementById('bowler-name').value;
    
    // Cache the old crease names to lookup in persistent arrays
    const oldBat1Name = inn.players.bat1.name;
    const oldBat2Name = inn.players.bat2.name;
    const oldBowlerName = inn.players.bowler.name;
    
    // Sync crease displays
    inn.players.bat1.name = bat1Val;
    inn.players.bat2.name = bat2Val;
    inn.players.bowler.name = bowlerVal;
    
    // Sync persistent batting/bowling scorecard stats
    const pBat1 = getPersistentBatter(oldBat1Name);
    if (pBat1) pBat1.name = bat1Val;
    
    const pBat2 = getPersistentBatter(oldBat2Name);
    if (pBat2) pBat2.name = bat2Val;
    
    const pBowler = inn.bowlingStats.find(b => b.name.toLowerCase() === oldBowlerName.toLowerCase());
    if (pBowler) pBowler.name = bowlerVal;
    
    // Sync squad rosters (Us & Them squads)
    const batSquad = getBattingSquad();
    const member1 = batSquad.find(p => p.name.toLowerCase() === oldBat1Name.toLowerCase());
    if (member1) member1.name = bat1Val;
    
    const member2 = batSquad.find(p => p.name.toLowerCase() === oldBat2Name.toLowerCase());
    if (member2) member2.name = bat2Val;
    
    const bowlSquad = getBowlingSquad();
    const bowlMember = bowlSquad.find(p => p.name.toLowerCase() === oldBowlerName.toLowerCase());
    if (bowlMember) bowlMember.name = bowlerVal;
    
    // Render rosters and scoreboard to keep everything in sync
    renderSquadGrid();
    renderScoreboard();
}

// Sets chasing target target runs
function setTarget() {
    const val = parseInt(document.getElementById('input-target').value);
    if (!isNaN(val) && val > 0) {
        matchState.target = val;
    } else {
        matchState.target = null;
    }
    renderScoreboard();
}

// ==========================================================
// PERSISTENT UTILITIES
// ==========================================================

function getPersistentBatter(name) {
    const inn = getActiveInnings();
    return inn.battingStats.find(b => b.name.toLowerCase() === name.toLowerCase());
}

function getActiveBowler() {
    const inn = getActiveInnings();
    return inn.bowlingStats.find(b => b.active);
}

// ==========================================================
// SQUAD ROSTER INTERACTION
// ==========================================================

function renderSquadGrid() {
    // 1. Render Team A Squad (squadUs)
    const gridUs = document.getElementById('roster-us-grid');
    if (gridUs) {
        gridUs.innerHTML = "";
        matchState.squadUs.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = "roster-row";
            
            let roleClass = "role-batsman";
            if (player.role === "Bowler") roleClass = "role-bowler";
            else if (player.role === "All-Rounder") roleClass = "role-allrounder";
            
            div.innerHTML = `
                <span class="roster-sno">${index + 1}</span>
                <span class="roster-name-static" style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${player.name}</span>
                <span class="roster-role-badge ${roleClass}">${player.role || 'Batsman'}</span>
            `;
            gridUs.appendChild(div);
        });
    }
    
    // 2. Render Team B Squad (squadThem)
    const gridThem = document.getElementById('roster-them-grid');
    if (gridThem) {
        gridThem.innerHTML = "";
        matchState.squadThem.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = "roster-row";
            
            let roleClass = "role-batsman";
            if (player.role === "Bowler") roleClass = "role-bowler";
            else if (player.role === "All-Rounder") roleClass = "role-allrounder";
            
            div.innerHTML = `
                <span class="roster-sno">${index + 1}</span>
                <span class="roster-name-static" style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${player.name}</span>
                <span class="roster-role-badge ${roleClass}">${player.role || 'Batsman'}</span>
            `;
            gridThem.appendChild(div);
        });
    }
}

function syncSquadMember(squadType, index, field, value) {
    saveStateSnapshot();
    const squad = squadType === 'us' ? matchState.squadUs : matchState.squadThem;
    squad[index][field] = value;
    
    // Update active crease players names if they are changed in rosters
    const inn = getActiveInnings();
    if (field === 'name') {
        const isUsBatting = (matchState.currentInnings === 1 && squadType === 'us') || (matchState.currentInnings === 2 && squadType === 'them');
        if (isUsBatting) {
            if (inn.players.bat1.name === squad[index].name) {
                inn.players.bat1.name = value;
                const p1 = getPersistentBatter(inn.players.bat1.name);
                if (p1) p1.name = value;
            } else if (inn.players.bat2.name === squad[index].name) {
                inn.players.bat2.name = value;
                const p2 = getPersistentBatter(inn.players.bat2.name);
                if (p2) p2.name = value;
            }
        }
    }
    renderScoreboard();
}

function addNewRosterPlayer(squadType) {
    saveStateSnapshot();
    const squad = squadType === 'us' ? matchState.squadUs : matchState.squadThem;
    let nextNum = squad.length + 1;
    
    squad.push({
        name: squadType === 'us' ? `Player ${nextNum}` : `Opp Bowler ${nextNum}`,
        role: squadType === 'us' ? "Batsman" : "Bowler",
        batted: false
    });
    
    renderSquadGrid();
    renderScoreboard();
}

function deleteSquadMember(squadType, index) {
    const squad = squadType === 'us' ? matchState.squadUs : matchState.squadThem;
    if (squad.length <= 2) {
        alert("Roster must have at least 2 active players!");
        return;
    }
    
    saveStateSnapshot();
    squad.splice(index, 1);
    
    renderSquadGrid();
    renderScoreboard();
}

// ==========================================================
// SCOREBOARD VIEW RENDERING & TABS
// ==========================================================

function switchViewTab(tabIndex) {
    matchState.activeViewTab = tabIndex;
    matchState.currentInnings = tabIndex;
    
    const tab1 = document.getElementById('tab-innings-1');
    const tab2 = document.getElementById('tab-innings-2');
    
    if (tabIndex === 1) {
        tab1.classList.add('active');
        tab2.classList.remove('active');
        tab1.querySelector('i').style.color = "var(--color-blue)";
        tab2.querySelector('i').style.color = "var(--text-muted)";
    } else {
        tab2.classList.add('active');
        tab1.classList.remove('active');
        tab2.querySelector('i').style.color = "var(--color-blue)";
        tab1.querySelector('i').style.color = "var(--text-muted)";
    }
    
    renderScoreboard();
}

function updateScoringControlStates() {
    const isViewingActive = matchState.activeViewTab === matchState.currentInnings;
    
    // Toggle target settings visibility (only visible in 2nd innings / after innings 1 completed)
    const targetCard = document.getElementById('target-setting-card');
    if (targetCard) {
        if (matchState.innings1Completed || matchState.currentInnings === 2) {
            targetCard.style.display = 'block';
        } else {
            targetCard.style.display = 'none';
        }
    }
    
    // Enable/disable crease text inputs
    const isMatchOver = matchState.innings1Completed && matchState.innings2Completed;
    const isInputEnabled = isViewingActive && !isMatchOver;
    
    document.getElementById('bat1-name').disabled = !isInputEnabled;
    document.getElementById('bat2-name').disabled = !isInputEnabled;
    document.getElementById('bowler-name').disabled = !isInputEnabled;
    
    const inputs = ['bat1-name', 'bat2-name', 'bowler-name'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.pointerEvents = isInputEnabled ? 'auto' : 'none';
    });
    
    // Enable/disable scoring action buttons
    const scoreBtns = document.querySelectorAll('.btn-score, .btn-extra, .btn-wicket');
    scoreBtns.forEach(btn => {
        btn.disabled = !isInputEnabled;
        btn.style.opacity = isInputEnabled ? '1' : '0.4';
        btn.style.pointerEvents = isInputEnabled ? 'auto' : 'none';
    });
    
    // Update sub-title status message
    const statusDisplay = document.getElementById('status-display');
    if (statusDisplay) {
        if (isMatchOver) {
            statusDisplay.innerHTML = `
                <span style="color: var(--color-gold); font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-trophy"></i> Match Completed!
                </span>
                <button class="btn btn-secondary btn-sm" onclick="showCompletedMatchModal()" style="margin-left: 12px; font-size: 0.72rem; padding: 4px 8px; border: 1px solid var(--color-gold) !important; color: var(--color-gold) !important; background: var(--color-gold-glow) !important; cursor: pointer; border-radius: var(--radius-sm); pointer-events: auto !important;">
                    <i class="fa-solid fa-eye"></i> View Summary & Awards
                </button>
            `;
        } else if (!isViewingActive) {
            statusDisplay.innerHTML = `<span style="color: var(--color-gold); font-weight: 700;"><i class="fa-solid fa-lock"></i> Viewing Completed Scorecard (Read-only)</span>`;
        } else {
            statusDisplay.innerHTML = matchState.currentInnings === 2 ? 
                `<span style="color: var(--color-blue); font-weight: 700;"><i class="fa-solid fa-gamepad"></i> Innings 2: Team B Chasing (Target ${matchState.target})</span>` : 
                `<span style="color: var(--color-green); font-weight: 700;"><i class="fa-solid fa-gamepad"></i> Innings 1: Team A Batting</span>`;
        }
    }
}

function renderScoreboard() {
    const inn = getViewingInnings();
    
    // 1. Digital score & wickets
    document.getElementById('score-runs').textContent = inn.runs;
    document.getElementById('score-wickets').textContent = inn.wickets;
    
    // 2. Overs display fraction
    let displayOvers = `${inn.overs}.${inn.ballsInOver}`;
    document.getElementById('score-overs').textContent = displayOvers;
    
    const maxOversLimitEl = document.getElementById('max-overs-limit');
    if (maxOversLimitEl) {
        maxOversLimitEl.textContent = `${matchMaxOvers}.0`;
    }
    
    // 3. Progress bar width (max overs)
    let totalBallsSoFar = (inn.overs * 6) + inn.ballsInOver;
    let maxBalls = matchMaxOvers * 6; // dynamic overs limit
    let progressPercentage = Math.min((totalBallsSoFar / maxBalls) * 100, 100);
    document.getElementById('overs-progress-fill').style.width = `${progressPercentage}%`;
    
    // 4. Over tracker count label
    document.getElementById('balls-in-over-count').textContent = `Balls: ${inn.ballsInOver} / 6`;
    
    // 5. Current Run Rate (CRR)
    let crr = 0;
    if (totalBallsSoFar > 0) {
        crr = (inn.runs / totalBallsSoFar) * 6;
    }
    document.getElementById('stat-crr').textContent = crr.toFixed(2);
    
    // 6. Target calculation (Required Run Rate)
    const rrrElement = document.getElementById('stat-rrr');
    const chaseBox = document.getElementById('chase-details');
    const chaseMsg = document.getElementById('chase-msg');
    
    if (matchState.target !== null && matchState.currentInnings === 2) {
        chaseBox.classList.remove('hidden');
        
        // Calculate based on Innings 2 actual parameters
        const inn2 = matchState.innings2;
        let totalBallsInn2 = (inn2.overs * 6) + inn2.ballsInOver;
        let runsNeeded = matchState.target - inn2.runs;
        let ballsRemaining = maxBalls - totalBallsInn2;
        
        if (runsNeeded <= 0) {
            chaseMsg.innerHTML = `🏆 Target achieved! **Team B** won the match.`;
            rrrElement.textContent = "0.00";
        } else if (ballsRemaining <= 0) {
            chaseMsg.innerHTML = `Match completed! Target was defended.`;
            rrrElement.textContent = "-";
        } else {
            let rrr = (runsNeeded / ballsRemaining) * 6;
            rrrElement.textContent = rrr.toFixed(2);
            chaseMsg.innerHTML = `Need <strong>${runsNeeded}</strong> runs in <strong>${ballsRemaining}</strong> balls`;
        }
    } else if (matchState.target !== null && matchState.currentInnings === 1) {
        chaseBox.classList.remove('hidden');
        chaseMsg.innerHTML = `Target to defend: <strong>${matchState.target}</strong> Runs`;
        rrrElement.textContent = "-";
    } else {
        chaseBox.classList.add('hidden');
        rrrElement.textContent = "-";
    }
    
    // 7. Batsmen Crease Table Rows Render
    const b1 = inn.players.bat1;
    const b2 = inn.players.bat2;
    
    document.getElementById('bat1-name').value = b1.name;
    document.getElementById('bat1-runs').textContent = `${b1.runs}${b1.onStrike ? '*' : ''}`;
    document.getElementById('bat1-balls').textContent = b1.balls;
    document.getElementById('bat1-fours').textContent = b1.fours;
    document.getElementById('bat1-sixes').textContent = b1.sixes;
    document.getElementById('bat1-sr').textContent = b1.balls > 0 ? ((b1.runs / b1.balls) * 100).toFixed(1) : "0.0";
    
    const row1 = document.getElementById('row-batsman-1');
    if (b1.onStrike) row1.classList.add('active-strike');
    else row1.classList.remove('active-strike');
    
    document.getElementById('bat2-name').value = b2.name;
    document.getElementById('bat2-runs').textContent = `${b2.runs}${b2.onStrike ? '*' : ''}`;
    document.getElementById('bat2-balls').textContent = b2.balls;
    document.getElementById('bat2-fours').textContent = b2.fours;
    document.getElementById('bat2-sixes').textContent = b2.sixes;
    document.getElementById('bat2-sr').textContent = b2.balls > 0 ? ((b2.runs / b2.balls) * 100).toFixed(1) : "0.0";
    
    const row2 = document.getElementById('row-batsman-2');
    if (b2.onStrike) row2.classList.add('active-strike');
    else row2.classList.remove('active-strike');
    
    // Bowler Crease Table Row Render
    const bowler = inn.players.bowler;
    document.getElementById('bowler-name').value = bowler.name;
    document.getElementById('bowler-overs').textContent = bowler.overs;
    document.getElementById('bowler-runs').textContent = bowler.runs;
    document.getElementById('bowler-wickets').textContent = bowler.wickets;
    
    let bowlerEcon = 0;
    if (bowler.balls > 0) {
        bowlerEcon = (bowler.runs / bowler.balls) * 6;
    }
    document.getElementById('bowler-econ').textContent = bowlerEcon.toFixed(1);
    
    // 8. Ball List circles render
    const ballList = document.getElementById('ball-list');
    ballList.innerHTML = "";
    
    if (inn.currentOverBalls.length === 0) {
        ballList.innerHTML = `<span class="empty-ball-placeholder">Waiting for first ball...</span>`;
    } else {
        inn.currentOverBalls.forEach(ball => {
            const span = document.createElement('span');
            
            let badgeClass = "ball-badge";
            if (ball.type === "four") badgeClass += " ball-four";
            else if (ball.type === "six") badgeClass += " ball-six";
            else if (ball.type === "extra") badgeClass += " ball-extra";
            else if (ball.type === "wicket") badgeClass += " ball-wicket";
            else if (ball.label === "•") badgeClass += " ball-dot";
            else badgeClass += " ball-runs";
            
            span.className = badgeClass;
            span.textContent = ball.label;
            ballList.appendChild(span);
        });
    }
    
    // 9. DYNAMIC INNINGS SCORECARD RENDER
    renderInningsScorecard();
    
    // 10. Update Locks & opacity
    updateScoringControlStates();
}

function renderInningsScorecard() {
    const inn = getViewingInnings();
    
    // Render Batting List
    const battingList = document.getElementById('scorecard-batting-list');
    if (battingList) {
        battingList.innerHTML = `
            <div class="scorecard-row batting-grid header">
                <span>Batter</span>
                <span>Runs</span>
                <span>Balls</span>
                <span>4s</span>
                <span>6s</span>
                <span>SR</span>
            </div>
        `;
        
        inn.battingStats.forEach(b => {
            const row = document.createElement('div');
            row.className = "scorecard-row batting-grid";
            
            let statusBadgeHtml = "";
            if (b.active) {
                // If batsman is active, show * if on-strike, and remove the status badge text!
                const activeStriker = getActiveStriker();
                const isOnStrike = activeStriker && activeStriker.name.toLowerCase() === b.name.toLowerCase();
                statusBadgeHtml = isOnStrike ? `<span style="color: var(--color-green); font-weight: 800; font-size: 0.95rem; margin-left: 4px;">*</span>` : "";
            } else {
                statusBadgeHtml = `<span class="scorecard-dismissal-text">${b.dismissal || 'OUT'}</span>`;
            }
            
            let sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0";
            
            row.innerHTML = `
                <div class="scorecard-name-wrapper">
                    <span>${b.name}</span>
                    ${statusBadgeHtml}
                </div>
                <span>${b.runs}</span>
                <span>${b.balls}</span>
                <span>${b.fours}</span>
                <span>${b.sixes}</span>
                <span>${sr}</span>
            `;
            battingList.appendChild(row);
        });
    }
    
    // Render Bowling List
    const bowlingList = document.getElementById('scorecard-bowling-list');
    if (bowlingList) {
        bowlingList.innerHTML = `
            <div class="scorecard-row bowling-grid header">
                <span>Bowler</span>
                <span>Overs</span>
                <span>Runs</span>
                <span>Wkts</span>
                <span>Econ</span>
            </div>
        `;
        
        inn.bowlingStats.forEach(bowler => {
            const row = document.createElement('div');
            row.className = "scorecard-row bowling-grid";
            
            let oversWhole = Math.floor(bowler.oversBalls / 6);
            let oversBallsLeft = bowler.oversBalls % 6;
            let displayOvers = `${oversWhole}.${oversBallsLeft}`;
            
            let econ = 0;
            if (bowler.oversBalls > 0) {
                econ = (bowler.runs / bowler.oversBalls) * 6;
            }
            
            row.innerHTML = `
                <div class="scorecard-name-wrapper">
                    <span>${bowler.name}</span>
                    ${bowler.active ? '<span class="scorecard-status-badge status-notout">active</span>' : ''}
                </div>
                <span>${displayOvers}</span>
                <span>${bowler.runs}</span>
                <span>${bowler.wickets}</span>
                <span>${econ.toFixed(1)}</span>
            `;
            bowlingList.appendChild(row);
        });
    }
}

// ==========================================================
// MATCH FLOW & COMPLETION CONTROLLERS
// ==========================================================

function checkMatchCompletion() {
    const inn = getActiveInnings();
    let totalBallsSoFar = (inn.overs * 6) + inn.ballsInOver;
    let maxBalls = matchMaxOvers * 6; // dynamic overs limit
    const maxWickets = getBattingSquad().length - 1;
    
    // Resolve custom team names dynamically from tab headers to use in congrats message
    const tab1Text = document.getElementById('tab-innings-1').textContent.trim();
    const team1Name = tab1Text ? tab1Text.replace(" Innings", "").trim() : "Team A";
    
    const tab2Text = document.getElementById('tab-innings-2').textContent.trim();
    const team2Name = tab2Text ? tab2Text.replace(" Innings", "").trim() : "Team B";
    
    if (matchState.currentInnings === 1) {
        if (inn.wickets >= maxWickets || totalBallsSoFar >= maxBalls) {
            matchState.innings1Completed = true;
            matchState.target = inn.runs + 1;
            
            // Show modal prompting Innings 2 launch
            showInningsTransitionModal();
        }
    } else {
        // Innings 2 Chasing logic
        if (matchState.target !== null && inn.runs >= matchState.target) {
            endMatch(`🏆 ${team2Name} chased ${team1Name}'s target of ${matchState.target}! ${team2Name}: ${inn.runs}/${inn.wickets}`);
        } 
        else if (inn.wickets >= maxWickets || totalBallsSoFar >= maxBalls) {
            if (inn.runs === matchState.target - 1) {
                endMatch(`Match Tied! Scores level. Final Score: ${inn.runs}/${inn.wickets}`);
            } else if (inn.runs < matchState.target - 1) {
                endMatch(`🏆 ${team1Name} Won! Defended target successfully. ${team2Name}: ${inn.runs}/${inn.wickets}`);
            }
        }
    }
}

function showInningsTransitionModal() {
    const inn1 = matchState.innings1;
    
    const modalTitle = document.getElementById('match-over-modal-title');
    if (modalTitle) modalTitle.textContent = "Innings Completed!";
    
    document.getElementById('modal-match-summary').innerHTML = `
        <strong>Innings 1 Completed!</strong><br><br>
        Team A Score: <strong>${inn1.runs}/${inn1.wickets}</strong> in ${inn1.overs}.${inn1.ballsInOver} Overs.<br>
        Team B needs: <strong>${matchState.target}</strong> Runs to win in ${matchMaxOvers}.0 Overs.
    `;
    
    // Re-program the buttons in match-over-modal for innings transition
    const modalButtons = document.querySelector('#match-over-modal .modal-buttons');
    modalButtons.innerHTML = `
        <button class="btn btn-primary" onclick="startSecondInnings(); closeMatchModal();">Start Innings 2 (Begin Defending)</button>
    `;
    
    document.getElementById('match-over-modal').classList.remove('hidden');
    document.getElementById('status-display').innerHTML = `<span style="color: var(--color-gold);"><i class="fa-solid fa-flag"></i> Innings 1 Completed!</span>`;
}

function startSecondInnings() {
    saveStateSnapshot();
    matchState.currentInnings = 2;
    matchState.activeViewTab = 2; // Auto-shift view to Innings 2
    
    // Render tabs update
    switchViewTab(2);
    renderScoreboard();
}

function calculateMatchAwards() {
    let playersMap = {}; // key: player name (lowercase) -> stats object
    
    // Helper to fetch or create a player stats bucket
    function getPlayer(name, team) {
        let key = name.toLowerCase();
        if (!playersMap[key]) {
            playersMap[key] = {
                name: name,
                team: team,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                wickets: 0,
                conceded: 0,
                ballsBowled: 0
            };
        }
        return playersMap[key];
    }
    
    // Resolve dynamic team names from innings tabs headers
    const tab1Text = document.getElementById('tab-innings-1').textContent.trim();
    const team1CustomName = tab1Text ? tab1Text.replace(" Innings", "") : "Team A";
    
    const tab2Text = document.getElementById('tab-innings-2').textContent.trim();
    const team2CustomName = tab2Text ? tab2Text.replace(" Innings", "") : "Team B";
    
    // Innings 1: Team 1 batting, Team 2 bowling
    matchState.innings1.battingStats.forEach(b => {
        let p = getPlayer(b.name, team1CustomName);
        p.runs += b.runs || 0;
        p.balls += b.balls || 0;
        p.fours += b.fours || 0;
        p.sixes += b.sixes || 0;
    });
    
    matchState.innings1.bowlingStats.forEach(bowler => {
        let p = getPlayer(bowler.name, team2CustomName);
        p.wickets += bowler.wickets || 0;
        p.conceded += bowler.runs || 0;
        p.ballsBowled += bowler.oversBalls || 0;
    });
    
    // Innings 2: Team 2 batting, Team 1 bowling
    matchState.innings2.battingStats.forEach(b => {
        let p = getPlayer(b.name, team2CustomName);
        p.runs += b.runs || 0;
        p.balls += b.balls || 0;
        p.fours += b.fours || 0;
        p.sixes += b.sixes || 0;
    });
    
    matchState.innings2.bowlingStats.forEach(bowler => {
        let p = getPlayer(bowler.name, team1CustomName);
        p.wickets += bowler.wickets || 0;
        p.conceded += bowler.runs || 0;
        p.ballsBowled += bowler.oversBalls || 0;
    });
    
    let playersList = Object.values(playersMap);
    
    // 1. Calculate Best Batter
    let bestBatter = null;
    playersList.forEach(p => {
        if (p.runs > 0) {
            if (!bestBatter) {
                bestBatter = p;
            } else if (p.runs > bestBatter.runs) {
                bestBatter = p;
            } else if (p.runs === bestBatter.runs && p.balls < bestBatter.balls) {
                bestBatter = p;
            }
        }
    });
    
    // 2. Calculate Best Bowler
    let bestBowler = null;
    playersList.forEach(p => {
        if (p.wickets > 0 || p.ballsBowled > 0) {
            if (!bestBowler) {
                bestBowler = p;
            } else if (p.wickets > bestBowler.wickets) {
                bestBowler = p;
            } else if (p.wickets === bestBowler.wickets && p.conceded < bestBowler.conceded) {
                bestBowler = p;
            }
        }
    });
    
    // 3. Calculate Man of the Match (MoM)
    let mom = null;
    let maxScore = -9999;
    
    playersList.forEach(p => {
        // Balanced Performance rating index formula
        let score = (p.runs * 1) + 
                    (p.fours * 1) + 
                    (p.sixes * 2) + 
                    (p.wickets * 25) + 
                    (p.ballsBowled * 1.5) - 
                    (p.conceded * 0.5);
                    
        p.momScore = score;
        if (score > maxScore) {
            maxScore = score;
            mom = p;
        }
    });
    
    return { mom, bestBatter, bestBowler };
}

function endMatch(message) {
    matchState.innings2Completed = true; // Mark match as fully completed!
    
    const modalTitle = document.getElementById('match-over-modal-title');
    if (modalTitle) modalTitle.textContent = "Match Completed!";
    
    const awards = calculateMatchAwards();
    matchState.awards = awards; // Store in matchState to persist in saved logs
    
    // Automatically save completed match to Match History so the user never loses their data!
    try {
        let savedMatches = JSON.parse(localStorage.getItem('silent_killer_matches') || '[]');
        let matchRecord = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            state: JSON.parse(JSON.stringify(matchState))
        };
        savedMatches.unshift(matchRecord);
        localStorage.setItem('silent_killer_matches', JSON.stringify(savedMatches));
        loadSavedMatches(); // Refresh the Match History sidebar in real time!
    } catch (e) {
        console.error("Error auto-saving completed match:", e);
    }
    
    let awardsHtml = "";
    if (awards.mom) {
        let oversBowled = Math.floor(awards.mom.ballsBowled / 6) + "." + (awards.mom.ballsBowled % 6);
        let statsStr = [];
        if (awards.mom.runs > 0) statsStr.push(`${awards.mom.runs} Runs (${awards.mom.balls}b)`);
        if (awards.mom.wickets > 0 || awards.mom.ballsBowled > 0) statsStr.push(`${awards.mom.wickets} Wkts for ${awards.mom.conceded} (${oversBowled} Ov)`);
        
        let batterStats = awards.bestBatter ? `${awards.bestBatter.runs} Runs off ${awards.bestBatter.balls} balls (${awards.bestBatter.fours}x4, ${awards.bestBatter.sixes}x6)` : "N/A";
        let bowlerStats = awards.bestBowler ? `${awards.bestBowler.wickets} Wkts for ${awards.bestBowler.conceded} runs (${Math.floor(awards.bestBowler.ballsBowled/6)}.${awards.bestBowler.ballsBowled%6} Overs)` : "N/A";
        
        awardsHtml = `
            <div class="awards-card" style="margin-top: 20px;">
                <h3><i class="fa-solid fa-trophy"></i> Match Awards</h3>
                
                <div class="award-row">
                    <div class="award-title"><i class="fa-solid fa-award"></i> Man of the Match</div>
                    <div class="award-winner-details">
                        <div class="award-winner-name">${awards.mom.name}</div>
                        <div class="award-winner-stats">${awards.mom.team} | ${statsStr.join(" & ") || "Outstanding Performance"}</div>
                    </div>
                </div>
                
                <div class="award-row">
                    <div class="award-title"><i class="fa-solid fa-user-pen"></i> Best Batter</div>
                    <div class="award-winner-details">
                        <div class="award-winner-name">${awards.bestBatter ? awards.bestBatter.name : "N/A"}</div>
                        <div class="award-winner-stats">${awards.bestBatter ? awards.bestBatter.team : ""} | ${batterStats}</div>
                    </div>
                </div>
                
                <div class="award-row">
                    <div class="award-title"><i class="fa-solid fa-baseball"></i> Best Bowler</div>
                    <div class="award-winner-details">
                        <div class="award-winner-name">${awards.bestBowler ? awards.bestBowler.name : "N/A"}</div>
                        <div class="award-winner-stats">${awards.bestBowler ? awards.bestBowler.team : ""} | ${bowlerStats}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Resolve custom team names for completed modal
    const tab1Text = document.getElementById('tab-innings-1').textContent.trim();
    const team1Name = tab1Text ? tab1Text.replace(" Innings", "") : "Team A";
    
    const tab2Text = document.getElementById('tab-innings-2').textContent.trim();
    const team2Name = tab2Text ? tab2Text.replace(" Innings", "") : "Team B";

    document.getElementById('modal-match-summary').innerHTML = `
        <strong>Match Completed!</strong><br><br>
        ${team1Name}: <strong>${matchState.innings1.runs}/${matchState.innings1.wickets}</strong><br>
        ${team2Name}: <strong>${matchState.innings2.runs}/${matchState.innings2.wickets}</strong><br><br>
        Result: <strong>${message}</strong>
        ${awardsHtml}
    `;
    
    const modalButtons = document.querySelector('#match-over-modal .modal-buttons');
    modalButtons.innerHTML = `
        <button class="btn btn-primary" onclick="if (confirmReset()) closeMatchModal();"><i class="fa-solid fa-rotate-right"></i> Start New Match</button>
        <button class="btn btn-secondary" onclick="closeMatchModal()">View Full Scorecard</button>
    `;
    
    document.getElementById('match-over-modal').classList.remove('hidden');
    document.getElementById('status-display').innerHTML = `<span style="color: var(--color-gold);"><i class="fa-solid fa-trophy"></i> Match Completed!</span>`;
}

function closeMatchModal() {
    document.getElementById('match-over-modal').classList.add('hidden');
}

function showCompletedMatchModal() {
    document.getElementById('match-over-modal').classList.remove('hidden');
}

function confirmReset() {
    const isMatchCompleted = matchState.innings1Completed && matchState.innings2Completed;
    
    // If the match is already completed, auto-reset directly with no redundant prompts!
    if (isMatchCompleted) {
        resetState(true); // Reset to fresh blank rosters
        return true;
    }
    
    // If match is in progress, offer manual save option
    if (matchState.innings1.runs > 0 || matchState.innings2.runs > 0) {
        if (confirm("Match is in progress. Would you like to save the current state to your Match History before resetting?")) {
            saveCurrentMatch();
        }
    }

    if (confirm("Are you sure you want to reset the scoreboard to start a new match and register fresh squads?")) {
        resetState(true); // Reset to fresh blank rosters
        return true; // Reset successfully performed!
    }
    return false; // User cancelled, do not reset!
}

// ==========================================================
// PERSISTENT DATA LOGS & HISTORY
// ==========================================================

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const icon = document.querySelector('.btn-theme i');
    
    if (currentTheme === 'light') {
        document.body.removeAttribute('data-theme');
        icon.className = 'fa-solid fa-moon';
    } else {
        document.body.setAttribute('data-theme', 'light');
        icon.className = 'fa-solid fa-sun';
    }
}

function saveCurrentMatch() {
    let savedMatches = JSON.parse(localStorage.getItem('silent_killer_matches') || '[]');
    
    let matchRecord = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        // Save the full 2-innings match state
        state: JSON.parse(JSON.stringify(matchState))
    };
    
    savedMatches.unshift(matchRecord);
    localStorage.setItem('silent_killer_matches', JSON.stringify(savedMatches));
    
    loadSavedMatches();
    alert("Match saved to history!");
}

function loadSavedMatches() {
    const container = document.getElementById('history-setup-container');
    if (!container) return;
    
    let savedMatches = JSON.parse(localStorage.getItem('silent_killer_matches') || '[]');
    
    if (savedMatches.length === 0) {
        container.innerHTML = `<p class="no-history-text">No matches saved yet.</p>`;
    } else {
        container.innerHTML = "";
        savedMatches.forEach(match => {
            const item = document.createElement('div');
            item.className = "history-card-item";
            item.style.cursor = "pointer";
            item.onclick = () => openHistoryDetailsModal(match.id);
            
            // Migrate old match state data format to 2-innings format to prevent page load crashes!
            const s = migrateMatchState(match.state);
            const team1 = s.team1Name || "Team A";
            const team2 = s.team2Name || "Team B";
            
            // Check if second innings was started
            const hasSecondInnings = s.currentInnings === 2 || (s.innings2 && (s.innings2.runs > 0 || s.innings2.wickets > 0 || s.innings2.totalValidBalls > 0));
            
            item.innerHTML = `
                <div class="history-card-title" style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.88rem; margin-bottom: 6px;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">${team1} vs ${team2}</span>
                </div>
                <div class="history-card-details" style="display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>${team1}: <strong>${s.innings1.runs}/${s.innings1.wickets}</strong></span>
                        <span>(${s.innings1.overs}.${s.innings1.ballsInOver} Ov)</span>
                    </div>
                    ${hasSecondInnings ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${team2}: <strong>${s.innings2.runs}/${s.innings2.wickets}</strong></span>
                        <span>(${s.innings2.overs}.${s.innings2.ballsInOver} Ov)</span>
                    </div>
                    ` : ''}
                </div>
                <div class="history-card-date" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(255,255,255,0.04); padding-top: 8px; font-size: 0.72rem;">
                    <span>${match.date}</span>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="btn-history-delete" onclick="event.stopPropagation(); deleteMatchFromHistory(${match.id});" style="background: none; border: none; color: var(--color-danger); opacity: 0.65; cursor: pointer; padding: 2px; transition: var(--transition);" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';" onmouseout="this.style.opacity='0.65'; this.style.transform='scale(1)';" title="Delete Match Record">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        <span style="color: var(--color-gold); font-weight: 700; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-eye"></i> View</span>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }
}

function deleteMatchFromHistory(id) {
    if (confirm("Are you sure you want to delete this match record from your history? This cannot be undone.")) {
        saveStateSnapshot();
        let savedMatches = JSON.parse(localStorage.getItem('silent_killer_matches') || '[]');
        savedMatches = savedMatches.filter(m => m.id !== id);
        localStorage.setItem('silent_killer_matches', JSON.stringify(savedMatches));
        loadSavedMatches(); // Refresh live view list!
    }
}

function openHistoryDetailsModal(id) {
    let savedMatches = JSON.parse(localStorage.getItem('silent_killer_matches') || '[]');
    let match = savedMatches.find(m => m.id === id);
    if (!match) return;
    
    // Migrate loaded match state data format
    match.state = migrateMatchState(match.state);
    
    // Store globally inside details modal tracker
    loadedHistoryMatch = match;
    loadedHistoryActiveTab = 1;
    
    // Build tabs inside detail modal
    const tabUs = document.getElementById('btn-history-tab-1');
    const tabThem = document.getElementById('btn-history-tab-2');
    
    tabUs.className = "tab-btn active";
    tabThem.className = "tab-btn";
    
    // Set dynamic custom team tab texts
    tabUs.textContent = `${match.state.team1Name || "Team A"} Innings`;
    tabThem.textContent = `${match.state.team2Name || "Team B"} Innings`;
    
    renderHistoryModalScorecard();
    
    const modal = document.getElementById('history-details-modal');
    if (modal) modal.classList.add('open');
    const overlay = document.getElementById('history-details-overlay');
    if (overlay) overlay.classList.add('open');
}

function toggleHistoryModalTab(tabIndex) {
    loadedHistoryActiveTab = tabIndex;
    
    const tabUs = document.getElementById('btn-history-tab-1');
    const tabThem = document.getElementById('btn-history-tab-2');
    
    if (tabIndex === 1) {
        tabUs.classList.add('active');
        tabThem.classList.remove('active');
    } else {
        tabThem.classList.add('active');
        tabUs.classList.remove('active');
    }
    
    renderHistoryModalScorecard();
}

function renderHistoryModalScorecard() {
    if (!loadedHistoryMatch) return;
    
    const s = loadedHistoryMatch.state;
    const inn = loadedHistoryActiveTab === 1 ? s.innings1 : s.innings2;
    
    const t1 = s.team1Name || "Team A";
    const t2 = s.team2Name || "Team B";
    const battingTeamLabel = loadedHistoryActiveTab === 1 ? `${t1} Innings` : `${t2} Innings`;
    
    // Set title and metadata
    document.getElementById('history-modal-title').innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-green);"></i> Scorecard Viewer`;
    document.getElementById('history-modal-date').textContent = `Date Played: ${loadedHistoryMatch.date}`;
    
    // Determine summary description
    let summaryText = "";
    if (s.target === null) {
        summaryText = `${battingTeamLabel} - ${s.innings1Completed ? "Completed" : "In Progress"}: ${inn.runs}/${inn.wickets} in ${inn.overs}.${inn.ballsInOver} Overs`;
    } else {
        if (loadedHistoryActiveTab === 1) {
            summaryText = `Innings 1 Completed: ${s.innings1.runs}/${s.innings1.wickets}. Target set: ${s.target} Runs.`;
        } else {
            if (s.innings2Completed) {
                if (s.innings2.runs >= s.target) {
                    summaryText = `🏆 ${t2} successfully chased Target of ${s.target}! (${s.innings2.runs}/${s.innings2.wickets})`;
                } else {
                    summaryText = `🏆 ${t1} defended Target of ${s.target}! (${t2}: ${s.innings2.runs}/${s.innings2.wickets})`;
                }
            } else {
                summaryText = `Innings 2 in Progress: ${s.innings2.runs}/${s.innings2.wickets} in ${s.innings2.overs}.${s.innings2.ballsInOver} Overs (Target: ${s.target})`;
            }
        }
    }
    document.getElementById('history-modal-summary').innerHTML = summaryText;
    
    // Populate batting list
    const battingList = document.getElementById('history-batting-list');
    battingList.innerHTML = `
        <div class="scorecard-row batting-grid header" style="grid-template-columns: 160px repeat(5, 1fr); padding: 10px 0; font-size: 0.88rem;">
            <span>Batter</span>
            <span>R</span>
            <span>B</span>
            <span>4s</span>
            <span>6s</span>
            <span>SR</span>
        </div>
    `;
    
    inn.battingStats.forEach(b => {
        const row = document.createElement('div');
        row.className = "scorecard-row batting-grid";
        row.style.gridTemplateColumns = "160px repeat(5, 1fr)";
        row.style.padding = "10px 12px";
        row.style.fontSize = "1.05rem";
        
        const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0";
        
        let statusBadgeHtml = "";
        if (b.active) {
            statusBadgeHtml = `<span class="scorecard-status-badge status-notout" style="font-size: 0.7rem; padding: 2px 6px;">not out</span>`;
        } else {
            statusBadgeHtml = `<span class="scorecard-dismissal-text" style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-left: 8px;">${b.dismissal || 'OUT'}</span>`;
        }
        
        row.innerHTML = `
            <div class="scorecard-name-wrapper" style="font-size: 0.95rem;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${b.name}</span>
                ${statusBadgeHtml}
            </div>
            <span>${b.runs}</span>
            <span>${b.balls}</span>
            <span>${b.fours}</span>
            <span>${b.sixes}</span>
            <span>${sr}</span>
        `;
        battingList.appendChild(row);
    });
    
    // Populate bowling list
    const bowlingList = document.getElementById('history-bowling-list');
    bowlingList.innerHTML = `
        <div class="scorecard-row bowling-grid header" style="grid-template-columns: 160px repeat(4, 1fr); padding: 10px 0; font-size: 0.88rem;">
            <span>Bowler</span>
            <span>O</span>
            <span>R</span>
            <span>W</span>
            <span>Econ</span>
        </div>
    `;
    
    inn.bowlingStats.forEach(bowler => {
        const row = document.createElement('div');
        row.className = "scorecard-row bowling-grid";
        row.style.gridTemplateColumns = "160px repeat(4, 1fr)";
        row.style.padding = "10px 12px";
        row.style.fontSize = "1.05rem";
        
        let oWhole = Math.floor(bowler.oversBalls / 6);
        let oLeft = bowler.oversBalls % 6;
        let displayOvers = `${oWhole}.${oLeft}`;
        
        let econ = 0;
        if (bowler.oversBalls > 0) {
            econ = (bowler.runs / bowler.oversBalls) * 6;
        }
        
        row.innerHTML = `
            <div class="scorecard-name-wrapper" style="font-size: 0.95rem;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${bowler.name}</span>
                ${bowler.active ? '<span class="scorecard-status-badge status-notout" style="font-size: 0.7rem; padding: 2px 6px;">active</span>' : ''}
            </div>
            <span>${displayOvers}</span>
            <span>${bowler.runs}</span>
            <span>${bowler.wickets}</span>
            <span>${econ.toFixed(1)}</span>
        `;
        bowlingList.appendChild(row);
    });
    
    // Populate extras
    document.getElementById('history-modal-wides').textContent = inn.extras.wides || 0;
    document.getElementById('history-modal-noballs').textContent = inn.extras.noBalls || 0;
    document.getElementById('history-modal-byes').textContent = inn.extras.byes || 0;
    document.getElementById('history-modal-target').textContent = s.target !== null ? `${s.target} Runs` : "None Set";
    
    // Populate awards inside history details modal
    const awardsContainer = document.getElementById('history-awards-container');
    if (awardsContainer) {
        awardsContainer.innerHTML = "";
        if (s.awards && s.awards.mom) {
            let mom = s.awards.mom;
            let bestBatter = s.awards.bestBatter;
            let bestBowler = s.awards.bestBowler;
            
            let momStats = [];
            if (mom.runs > 0) momStats.push(`${mom.runs} Runs (${mom.balls}b)`);
            if (mom.wickets > 0 || mom.ballsBowled > 0) momStats.push(`${mom.wickets} Wkts for ${mom.conceded} (${Math.floor(mom.ballsBowled/6)}.${mom.ballsBowled%6} Ov)`);
            
            let batterStats = bestBatter ? `${bestBatter.runs} Runs off ${bestBatter.balls} balls (${bestBatter.fours}x4, ${bestBatter.sixes}x6)` : "N/A";
            let bowlerStats = bestBowler ? `${bestBowler.wickets} Wkts for ${bestBowler.conceded} runs (${Math.floor(bestBowler.ballsBowled/6)}.${bestBowler.ballsBowled%6} Overs)` : "N/A";
            
            awardsContainer.innerHTML = `
                <div class="awards-card" style="margin-top: 16px;">
                    <h3><i class="fa-solid fa-trophy"></i> Match Awards</h3>
                    
                    <div class="award-row">
                        <div class="award-title"><i class="fa-solid fa-award"></i> Man of the Match</div>
                        <div class="award-winner-details">
                            <div class="award-winner-name">${mom.name}</div>
                            <div class="award-winner-stats">${mom.team} | ${momStats.join(" & ") || "Outstanding Performance"}</div>
                        </div>
                    </div>
                    
                    <div class="award-row">
                        <div class="award-title"><i class="fa-solid fa-user-pen"></i> Best Batter</div>
                        <div class="award-winner-details">
                            <div class="award-winner-name">${bestBatter ? bestBatter.name : "N/A"}</div>
                            <div class="award-winner-stats">${bestBatter ? bestBatter.team : ""} | ${batterStats}</div>
                        </div>
                    </div>
                    
                    <div class="award-row">
                        <div class="award-title"><i class="fa-solid fa-baseball"></i> Best Bowler</div>
                        <div class="award-winner-details">
                            <div class="award-winner-name">${bestBowler ? bestBowler.name : "N/A"}</div>
                            <div class="award-winner-stats">${bestBowler ? bestBowler.team : ""} | ${bowlerStats}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

function closeHistoryDetailsModal() {
    const modal = document.getElementById('history-details-modal');
    if (modal) modal.classList.remove('open');
    const overlay = document.getElementById('history-details-overlay');
    if (overlay) overlay.classList.remove('open');
    loadedHistoryMatch = null;
}

// Converts any old single-innings saved match states dynamically into the new 2-innings format to guarantee crash-free loads
function migrateMatchState(loadedState) {
    if (!loadedState) return null;
    
    // If already in 2-innings format, return as is
    if (loadedState.innings1 && loadedState.innings2) {
        loadedState.team1Name = loadedState.team1Name || "Team A";
        loadedState.team2Name = loadedState.team2Name || loadedState.opponentTeam || "Team B";
        loadedState.teamAName = loadedState.teamAName || loadedState.team1Name;
        loadedState.teamBName = loadedState.teamBName || loadedState.team2Name;
        loadedState.maxOvers = loadedState.maxOvers || 6;
        return loadedState;
    }
    
    // Convert old format to 2-innings
    let newState = {
        opponentTeam: loadedState.opponentTeam || "Team B",
        teamAName: loadedState.teamAName || "Team A",
        teamBName: loadedState.teamBName || loadedState.opponentTeam || "Team B",
        team1Name: loadedState.team1Name || "Team A",
        team2Name: loadedState.team2Name || loadedState.opponentTeam || "Team B",
        maxOvers: loadedState.maxOvers || 6,
        currentInnings: 1,
        activeViewTab: 1,
        innings1Completed: true,
        innings2Completed: false,
        target: loadedState.target || null,
        
        squadUs: loadedState.squad || [
            { name: "Ashok", role: "All-Rounder", batted: true },
            { name: "Batsman 2", role: "Batsman", batted: true }
        ],
        squadThem: [
            { name: "Opp Batter 1", role: "Batsman", batted: true },
            { name: "Opp Batter 2", role: "Batsman", batted: true },
            { name: "Bowler 1", role: "Bowler", batted: false },
            { name: "Bowler 2", role: "Bowler", batted: false }
        ],
        
        innings1: {
            runs: loadedState.runs || 0,
            wickets: loadedState.wickets || 0,
            overs: loadedState.overs || 0,
            ballsInOver: loadedState.ballsInOver || 0,
            totalValidBalls: loadedState.totalValidBalls || 0,
            extras: loadedState.extras || { wides: 0, noBalls: 0, byes: 0 },
            players: loadedState.players || {
                bat1: { name: "Ashok", runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true },
                bat2: { name: "Batsman 2", runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: false },
                bowler: { name: "Bowler 1", overs: "0.0", balls: 0, runs: 0, wickets: 0 }
            },
            currentOverBalls: loadedState.currentOverBalls || [],
            battingStats: loadedState.battingStats || [],
            bowlingStats: loadedState.bowlingStats || []
        },
        
        innings2: {
            runs: 0,
            wickets: 0,
            overs: 0,
            ballsInOver: 0,
            totalValidBalls: 0,
            extras: { wides: 0, noBalls: 0, byes: 0 },
            players: {
                bat1: { name: "Opp Batter 1", runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true },
                bat2: { name: "Opp Batter 2", runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: false },
                bowler: { name: "Ashok", overs: "0.0", balls: 0, runs: 0, wickets: 0 }
            },
            currentOverBalls: [],
            battingStats: [
                { name: "Opp Batter 1", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true },
                { name: "Opp Batter 2", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true }
            ],
            bowlingStats: [
                { name: "Ashok", oversWhole: 0, oversBalls: 0, runs: 0, wickets: 0, active: true }
            ]
        }
    };
    
    // Backport persistent battingStats active/inactive if not present
    if (newState.innings1.battingStats.length > 0) {
        newState.innings1.battingStats.forEach(b => {
            if (b.active === undefined) b.active = !b.out;
        });
    }
    
    return newState;
}

// ==========================================================
// MATCH SETUP & ROSTER BUILDERS ENGINE
// ==========================================================

function renderSetupSquads() {
    // 1. Render Team A list
    const listA = document.getElementById('setup-team-a-list');
    if (listA) {
        listA.innerHTML = "";
        setupSquadA.forEach((player, index) => {
            const row = document.createElement('div');
            row.className = "setup-player-row";
            row.innerHTML = `
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-align: center;">${index + 1}</span>
                <input type="text" class="setup-input" value="${player.name}" oninput="updateSetupPlayer('a', ${index}, 'name', this.value)" placeholder="Player Name" style="width: 100%;" aria-label="Player Name">
                <select class="setup-select" onchange="updateSetupPlayer('a', ${index}, 'role', this.value)" style="width: 110px;" aria-label="Player Role">
                    <option value="Batsman" ${player.role === 'Batsman' ? 'selected' : ''}>Batsman</option>
                    <option value="Bowler" ${player.role === 'Bowler' ? 'selected' : ''}>Bowler</option>
                    <option value="All-Rounder" ${player.role === 'All-Rounder' ? 'selected' : ''}>All-Rounder</option>
                </select>
                <button class="btn-roster-delete" onclick="deleteSetupPlayer('a', ${index})" style="color: var(--color-danger); cursor: pointer;" aria-label="Delete Player"><i class="fa-solid fa-trash-can"></i></button>
            `;
            listA.appendChild(row);
        });
    }

    // 2. Render Team B list
    const listB = document.getElementById('setup-team-b-list');
    if (listB) {
        listB.innerHTML = "";
        setupSquadB.forEach((player, index) => {
            const row = document.createElement('div');
            row.className = "setup-player-row";
            row.innerHTML = `
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-align: center;">${index + 1}</span>
                <input type="text" class="setup-input" value="${player.name}" oninput="updateSetupPlayer('b', ${index}, 'name', this.value)" placeholder="Player Name" style="width: 100%;" aria-label="Player Name">
                <select class="setup-select" onchange="updateSetupPlayer('b', ${index}, 'role', this.value)" style="width: 110px;" aria-label="Player Role">
                    <option value="Batsman" ${player.role === 'Batsman' ? 'selected' : ''}>Batsman</option>
                    <option value="Bowler" ${player.role === 'Bowler' ? 'selected' : ''}>Bowler</option>
                    <option value="All-Rounder" ${player.role === 'All-Rounder' ? 'selected' : ''}>All-Rounder</option>
                </select>
                <button class="btn-roster-delete" onclick="deleteSetupPlayer('b', ${index})" style="color: var(--color-danger); cursor: pointer;" aria-label="Delete Player"><i class="fa-solid fa-trash-can"></i></button>
            `;
            listB.appendChild(row);
        });
    }
}

function updateSetupPlayer(team, index, key, value) {
    const list = team === 'a' ? setupSquadA : setupSquadB;
    if (list[index]) {
        list[index][key] = value;
    }
}

function addSetupPlayer(team) {
    const list = team === 'a' ? setupSquadA : setupSquadB;
    const defaultName = `Player ${list.length + 1}`;
    list.push({ name: defaultName, role: "Batsman" });
    renderSetupSquads();
}

function deleteSetupPlayer(team, index) {
    const list = team === 'a' ? setupSquadA : setupSquadB;
    list.splice(index, 1);
    renderSetupSquads();
}

// Collects setup settings, configures matchState, and launches scoreboard
let matchMaxOvers = 6; // Dynamic overs tracker

function launchScoreboard() {
    // 1. Gather overs limit
    const oversInput = parseInt(document.getElementById('setup-overs').value);
    matchMaxOvers = !isNaN(oversInput) && oversInput > 0 ? oversInput : 6;
    
    // 2. Validate squads
    if (setupSquadA.length < 2 || setupSquadB.length < 2) {
        alert("Please register at least 2 players in both squads to start the match!");
        return;
    }
    
    // Check for empty names
    const hasEmptyA = setupSquadA.some(p => !p.name.trim());
    const hasEmptyB = setupSquadB.some(p => !p.name.trim());
    if (hasEmptyA || hasEmptyB) {
        alert("All registered players must have a name! Please check both squads.");
        return;
    }

    // 3. Process Toss configurations to map Innings teams
    const winner = document.getElementById('setup-toss-winner').value;
    const decision = document.getElementById('setup-toss-decision').value;
    
    const teamAName = document.getElementById('setup-team-a-name').value.trim() || "Team A";
    const teamBName = document.getElementById('setup-team-b-name').value.trim() || "Team B";
    
    let team1Roster, team2Roster;
    let team1Name, team2Name;
    
    if (winner === 'a') {
        if (decision === 'bat') {
            // Team A bats first, Team B bowls first
            team1Roster = JSON.parse(JSON.stringify(setupSquadA));
            team2Roster = JSON.parse(JSON.stringify(setupSquadB));
            team1Name = teamAName;
            team2Name = teamBName;
        } else {
            // Team A bowls first, Team B bats first
            team1Roster = JSON.parse(JSON.stringify(setupSquadB));
            team2Roster = JSON.parse(JSON.stringify(setupSquadA));
            team1Name = teamBName;
            team2Name = teamAName;
        }
    } else {
        if (decision === 'bat') {
            // Team B bats first, Team A bowls first
            team1Roster = JSON.parse(JSON.stringify(setupSquadB));
            team2Roster = JSON.parse(JSON.stringify(setupSquadA));
            team1Name = teamBName;
            team2Name = teamAName;
        } else {
            // Team B bowls first, Team A bats first
            team1Roster = JSON.parse(JSON.stringify(setupSquadA));
            team2Roster = JSON.parse(JSON.stringify(setupSquadB));
            team1Name = teamAName;
            team2Name = teamBName;
        }
    }

    // 4. Initialise dynamic matchState
    matchState = {
        opponentTeam: team2Name,
        teamAName: teamAName,
        teamBName: teamBName,
        team1Name: team1Name,
        team2Name: team2Name,
        maxOvers: matchMaxOvers,
        currentInnings: 1,
        activeViewTab: 1,
        innings1Completed: false,
        innings2Completed: false,
        target: null,
        
        squadUs: team1Roster,    // Innings 1 batting squad (bats first)
        squadThem: team2Roster,  // Innings 2 batting squad (bats second)
        
        innings1: {
            runs: 0,
            wickets: 0,
            overs: 0,
            ballsInOver: 0,
            totalValidBalls: 0,
            extras: { wides: 0, noBalls: 0, byes: 0 },
            players: {
                bat1: { name: team1Roster[0].name, runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true },
                bat2: { name: team1Roster[1].name, runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: false },
                bowler: { name: team2Roster[0].name, overs: "0.0", balls: 0, runs: 0, wickets: 0 }
            },
            currentOverBalls: [],
            battingStats: [
                { name: team1Roster[0].name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true },
                { name: team1Roster[1].name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true }
            ],
            bowlingStats: [
                { name: team2Roster[0].name, oversWhole: 0, oversBalls: 0, runs: 0, wickets: 0, active: true }
            ]
        },
        
        innings2: {
            runs: 0,
            wickets: 0,
            overs: 0,
            ballsInOver: 0,
            totalValidBalls: 0,
            extras: { wides: 0, noBalls: 0, byes: 0 },
            players: {
                bat1: { name: team2Roster[0].name, runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true },
                bat2: { name: team2Roster[1].name, runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: false },
                bowler: { name: team1Roster[0].name, overs: "0.0", balls: 0, runs: 0, wickets: 0 }
            },
            currentOverBalls: [],
            battingStats: [
                { name: team2Roster[0].name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true },
                { name: team2Roster[1].name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, active: true }
            ],
            bowlingStats: [
                { name: team1Roster[0].name, oversWhole: 0, oversBalls: 0, runs: 0, wickets: 0, active: true }
            ]
        }
    };
    
    // Set batted flags for initial batsmen in matchState squads
    matchState.squadUs[0].batted = true;
    matchState.squadUs[1].batted = true;
    matchState.squadThem[0].batted = true;
    matchState.squadThem[1].batted = true;

    stateHistory = []; // clear undo stack

    // 5. Update UI tab headers dynamically based on toss results!
    document.getElementById('tab-innings-1').innerHTML = `<i class="fa-solid fa-circle-chevron-right" style="color: var(--color-blue);"></i> ${team1Name} Innings`;
    document.getElementById('tab-innings-2').innerHTML = `<i class="fa-solid fa-circle-chevron-right" style="color: var(--text-dark);"></i> ${team2Name} Innings`;
    
    // Dynamic squad cards headers
    const squadCardUs = document.querySelector('.squad-rosters-grid > div:first-child h3');
    if (squadCardUs) squadCardUs.innerHTML = `<i class="fa-solid fa-shield-halved icon-spacing"></i> ${team1Name} Squad`;
    
    const squadCardThem = document.querySelector('.squad-rosters-grid > div:last-child h3');
    if (squadCardThem) squadCardThem.innerHTML = `<i class="fa-solid fa-users icon-spacing"></i> ${team2Name} Squad`;
    
    // 6. Transition screens
    document.getElementById('match-setup-screen').classList.add('hidden');
    document.getElementById('scoreboard-dashboard').classList.remove('hidden');
    
    // Sync status and inputs
    document.getElementById('bat1-name').value = team1Roster[0].name;
    document.getElementById('bat2-name').value = team1Roster[1].name;
    document.getElementById('bowler-name').value = team2Roster[0].name;
    
    switchViewTab(1);
    renderSquadGrid();
    renderScoreboard();
}

// ==========================================================
// WHATSAPP SCORE SHARING & CLOUD DATA SAFETY UTILITIES
// ==========================================================

function shareMatchToWhatsApp() {
    const inn = getActiveInnings();
    const t1 = matchState.team1Name || "Team A";
    const t2 = matchState.team2Name || "Team B";
    
    // Calculate overs completed
    let oversCompleted = `${inn.overs}.${inn.ballsInOver}`;
    let maxOvs = `${matchMaxOvers}.0`;
    
    let heading = `🏏 *SILENT KILLERS SCOREBOARD* 🏏\n🏆 *Live Match Score Update*\n\n`;
    let scoreText = `*${t1} vs ${t2}*\n`;
    
    if (matchState.currentInnings === 1) {
        scoreText += `*${t1} (Batting):* ${inn.runs}/${inn.wickets} in ${oversCompleted} Overs (Max ${maxOvs})\n`;
        scoreText += `_First Innings in progress_\n\n`;
    } else {
        const inn1 = matchState.innings1;
        scoreText += `*${t1} Innings:* ${inn1.runs}/${inn1.wickets} (${matchMaxOvers}.0 Ov)\n`;
        scoreText += `*${t2} (Chasing):* ${inn.runs}/${inn.wickets} in ${oversCompleted} Overs (Max ${maxOvs})\n`;
        if (matchState.target !== null) {
            let runsNeeded = matchState.target - inn.runs;
            let totalBallsInn2 = (inn.overs * 6) + inn.ballsInOver;
            let ballsRemaining = (matchMaxOvers * 6) - totalBallsInn2;
            
            if (runsNeeded <= 0) {
                scoreText += `🏆 *${t2} won the match!* (Target of ${matchState.target} reached)\n\n`;
            } else if (ballsRemaining <= 0) {
                scoreText += `🏆 *${t1} won the match!* (Target of ${matchState.target} defended successfully)\n\n`;
            } else {
                scoreText += `*Need ${runsNeeded} runs in ${ballsRemaining} balls* (Target ${matchState.target})\n\n`;
            }
        }
    }
    
    // Add crease batsmen details
    let creaseText = `*Crease Batsmen:*\n`;
    if (inn.players.bat1 && inn.players.bat1.name) {
        creaseText += `🏏 ${inn.players.bat1.name}: ${inn.players.bat1.runs}${inn.players.bat1.onStrike ? '*' : ''} (${inn.players.bat1.balls}b)\n`;
    }
    if (inn.players.bat2 && inn.players.bat2.name) {
        creaseText += `🏏 ${inn.players.bat2.name}: ${inn.players.bat2.runs}${inn.players.bat2.onStrike ? '*' : ''} (${inn.players.bat2.balls}b)\n`;
    }
    
    // Add bowler details
    let bowlerText = `\n*Bowler status:*\n`;
    if (inn.players.bowler && inn.players.bowler.name) {
        bowlerText += `⚾ ${inn.players.bowler.name}: ${inn.players.bowler.wickets}/${inn.players.bowler.runs} (${inn.players.bowler.overs} Ov)\n`;
    }
    
    let footer = `\n_Scored in real time via Silent Killers Score System_ 🏆`;
    
    let message = heading + scoreText + creaseText + bowlerText + footer;
    window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(message), "_blank");
}

function shareHistoryMatchToWhatsApp() {
    if (!loadedHistoryMatch) return;
    
    const s = loadedHistoryMatch.state;
    const t1 = s.team1Name || "Team A";
    const t2 = s.team2Name || "Team B";
    
    let heading = `🏏 *SILENT KILLERS SCOREBOARD* 🏏\n🏆 *Completed Match Scorecard*\n\n`;
    let scoreText = `*${t1} vs ${t2}*\n`;
    scoreText += `*${t1} Innings:* ${s.innings1.runs}/${s.innings1.wickets} in ${s.innings1.overs}.${s.innings1.ballsInOver} Overs\n`;
    scoreText += `*${t2} Innings:* ${s.innings2.runs}/${s.innings2.wickets} in ${s.innings2.overs}.${s.innings2.ballsInOver} Overs\n\n`;
    
    // Add result summary
    let resultText = `*Result:* _Match Played on ${loadedHistoryMatch.date}_\n`;
    
    if (s.target !== null) {
        if (s.innings2.runs >= s.target) {
            resultText += `🏆 *${t2} successfully chased down Target of ${s.target}!* \n`;
        } else if (s.innings2.runs === s.target - 1 && s.innings2Completed) {
            resultText += `🤝 *Match Tied!* Scores level.\n`;
        } else if (s.innings2Completed) {
            resultText += `🏆 *${t1} defended Target of ${s.target} successfully!* \n`;
        }
    }
    
    // Add Man of the Match awards if present
    let momText = "";
    if (s.awards && s.awards.mom) {
        momText = `\n🎖️ *Man of the Match:* _${s.awards.mom.name}_ (${s.awards.mom.team})\n`;
    }
    
    let footer = `\n_Scored via Silent Killers Score System_ 🏆`;
    
    let message = heading + scoreText + resultText + momText + footer;
    window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(message), "_blank");
}

function exportDataBackup() {
    try {
        let savedMatches = localStorage.getItem('silent_killer_matches') || '[]';
        let backupData = {
            appName: "Silent Killers Score System",
            backupDate: new Date().toLocaleDateString(),
            backupTimestamp: Date.now(),
            matches: JSON.parse(savedMatches),
            setupSquadA: setupSquadA || [],
            setupSquadB: setupSquadB || []
        };
        
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        let downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        
        let dateFilename = new Date().toISOString().slice(0, 10);
        downloadAnchor.setAttribute("download", `silent_killers_cricket_backup_${dateFilename}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    } catch (e) {
        console.error("Error exporting backup file:", e);
        alert("Failed to export backup file: " + e.message);
    }
}

function triggerImportBackup() {
    const fileInput = document.getElementById('backup-file-input');
    if (fileInput) fileInput.click();
}

function importDataBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Basic structure validation
            if (!data.appName || !Array.isArray(data.matches)) {
                alert("Invalid backup file format! Please upload a valid .json file generated by the Silent Killers Score System.");
                return;
            }
            
            if (confirm(`Valid backup file found from ${data.backupDate || 'unknown date'}.\nThis contains ${data.matches.length} matches. Restoring this backup will merge records into your current match list. Would you like to proceed?`)) {
                
                // Get existing matches list
                let currentMatches = JSON.parse(localStorage.getItem('silent_killer_matches') || '[]');
                
                // Merge lists by record ID to prevent duplicates
                let mergedMatches = [...currentMatches];
                data.matches.forEach(newMatch => {
                    if (!mergedMatches.some(m => m.id === newMatch.id)) {
                        mergedMatches.push(newMatch);
                    }
                });
                
                // Sort by timestamp descending
                mergedMatches.sort((a, b) => b.id - a.id);
                
                // Save back to localStorage
                localStorage.setItem('silent_killer_matches', JSON.stringify(mergedMatches));
                
                // Restore registered setup squads templates if present in backup file
                if (data.setupSquadA && data.setupSquadA.length > 0) setupSquadA = data.setupSquadA;
                if (data.setupSquadB && data.setupSquadB.length > 0) setupSquadB = data.setupSquadB;
                
                // Refresh elements
                loadSavedMatches();
                renderSetupSquads();
                
                alert("🎉 History backup successfully restored! All matches have been merged safely.");
            }
        } catch (err) {
            console.error("Error importing backup file:", err);
            alert("Failed to parse backup file: " + err.message);
        }
    };
    reader.readAsText(file);
}


