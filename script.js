(() => {
  const $ = id => document.getElementById(id);
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  /* ---------- Sparkles (little white touch) ---------- */
  const sp = $('sparkles');
  for (let i = 0; i < 26; i++){
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.top = (40 + Math.random() * 60) + '%';
    s.style.animationDelay = (Math.random() * 9) + 's';
    s.style.animationDuration = (6 + Math.random() * 6) + 's';
    s.style.width = s.style.height = (3 + Math.random() * 5) + 'px';
    sp.appendChild(s);
  }

  /* ---------- Screens ---------- */
  function show(id){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  /* ---------- State ---------- */
  const cfg = {mode:'pvc', sym:'X'};
  // rnd = chance the computer plays a random move (lower = smarter)
  const STAGES = [
    {name:'Rookie',     rnd:0.80},
    {name:'Apprentice', rnd:0.55},
    {name:'Skilled',    rnd:0.35},
    {name:'Expert',     rnd:0.15},
    {name:'Master',     rnd:0}
  ];
  let stage = 1;
  function updateStageBadge(){
    $('stageBadge').textContent = cfg.mode === 'pvc'
      ? `Stage ${stage} / ${STAGES.length} · ${STAGES[stage - 1].name}`
      : '';
  }
  let board, turn, active = false, paused = false, locked = false;
  let scores = {X:0, O:0, D:0}, inProgress = false, aiTimer = null;

  /* Setup chips */
  function chips(containerId, key, attr){
    $(containerId).addEventListener('click', e => {
      const c = e.target.closest('.chip');
      if (!c) return;
      [...$(containerId).children].forEach(x => x.classList.remove('sel'));
      c.classList.add('sel');
      cfg[key] = c.dataset[attr];
      updateSetup();
    });
  }
  chips('modeChips', 'mode', 'mode');
  chips('symChips', 'sym', 'sym');

  function updateSetup(){
    const pvc = cfg.mode === 'pvc';
    $('stageInfo').style.display = pvc ? 'block' : 'none';
    $('symWrap').style.display = pvc ? 'block' : 'none';
  }

  /* Build board */
  const boardEl = $('board');
  for (let i = 0; i < 9; i++){
    const c = document.createElement('div');
    c.className = 'cell';
    c.dataset.i = i;
    c.addEventListener('click', () => play(i));
    boardEl.appendChild(c);
  }
  const cells = [...boardEl.children];

  function names(){
    if (cfg.mode === 'pvp'){
      $('nameX').textContent = 'Player X';
      $('nameO').textContent = 'Player O';
    } else {
      $('nameX').textContent = cfg.sym === 'X' ? 'You (X)' : 'Computer (X)';
      $('nameO').textContent = cfg.sym === 'O' ? 'You (O)' : 'Computer (O)';
    }
  }
  function renderScores(){
    $('sx').textContent = scores.X;
    $('so').textContent = scores.O;
    $('sd').textContent = scores.D;
  }
  function isAI(p){ return cfg.mode === 'pvc' && p !== cfg.sym; }

  function newRound(){
    clearTimeout(aiTimer);
    hideGameOver();
    board = Array(9).fill(null);
    turn = 'X';
    active = true;
    locked = false;
    cells.forEach(c => { c.className = 'cell'; c.innerHTML = ''; });
    updateStatus();
    if (isAI(turn)) aiMove();
  }

  function startGame(){
    scores = {X:0, O:0, D:0};
    stage = 1;
    updateStageBadge();
    names();
    renderScores();
    inProgress = true;
    paused = false;
    show('game');
    $('pauseOverlay').classList.remove('show');
    newRound();
  }

  function updateStatus(msg){
    $('scoreX').classList.toggle('turn', active && turn === 'X');
    $('scoreO').classList.toggle('turn', active && turn === 'O');
    if (msg){ $('status').textContent = msg; return; }
    if (cfg.mode === 'pvp') $('status').textContent = `Player ${turn}'s turn`;
    else $('status').textContent = isAI(turn) ? 'Computer is thinking…' : 'Your turn';
  }

  function winner(b){
    for (const [a, c, d] of LINES){
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return {p:b[a], line:[a, c, d]};
    }
    return null;
  }

  function play(i){
    if (!active || paused || locked || board[i] || isAI(turn)) return;
    place(i);
  }

  function place(i){
    board[i] = turn;
    const c = cells[i];
    c.classList.add('taken', turn.toLowerCase(), 'pop');
    c.innerHTML = `<span>${turn}</span>`;

    const w = winner(board);
    if (w){
      active = false;
      scores[w.p]++;
      renderScores();
      w.line.forEach(k => cells[k].classList.add('win'));
      let msg;
      if (cfg.mode === 'pvp') msg = `🎉 Player ${w.p} wins!`;
      else msg = isAI(w.p) ? 'Computer wins this round' : '🎉 You win!';
      updateStatus(msg);
      const humanWon = cfg.mode === 'pvc' && !isAI(w.p);
      if (humanWon){
        const last = stage >= STAGES.length;
        showGameOver(
          last ? 'All Stages Complete' : `Stage ${stage} Complete`,
          last ? '🏆 You beat every stage!' : '⭐ Great job! Next stage unlocked.',
          !last
        );
      } else {
        showGameOver('Game Over', msg, false);
      }
      return;
    }
    if (board.every(Boolean)){
      active = false;
      scores.D++;
      renderScores();
      updateStatus("It's a draw!");
      showGameOver('Game Over', "It's a draw!", false);
      return;
    }
    turn = turn === 'X' ? 'O' : 'X';
    updateStatus();
    if (isAI(turn)) aiMove();
  }

  /* ---------- Game over / Replay ---------- */
  let overTimer = null;
  function showGameOver(title, msg, canAdvance){
    clearTimeout(overTimer);
    // short delay so the winning line stays visible first
    overTimer = setTimeout(() => {
      $('overTitle').textContent = title;
      $('resultText').textContent = msg;
      $('btnNextStage').style.display = canAdvance ? 'block' : 'none';
      $('overOverlay').classList.add('show');
    }, 1000);
  }
  function hideGameOver(){
    clearTimeout(overTimer);
    $('overOverlay').classList.remove('show');
  }

  /* ---------- Computer player ---------- */
  function aiMove(){
    locked = true;
    aiTimer = setTimeout(() => {
      locked = false;
      if (!active || paused) return;
      const empty = board.map((v, i) => v ? null : i).filter(v => v !== null);
      let move;
      if (Math.random() < STAGES[stage - 1].rnd){
        move = empty[Math.floor(Math.random() * empty.length)];
      } else {
        move = best(board, turn);
      }
      place(move);
    }, 550);
  }

  function best(b, me){
    const opp = me === 'X' ? 'O' : 'X';
    let bestScore = -Infinity, moves = [];
    for (let i = 0; i < 9; i++){
      if (b[i]) continue;
      b[i] = me;
      const s = minimax(b, false, me, opp, 0);
      b[i] = null;
      if (s > bestScore){ bestScore = s; moves = [i]; }
      else if (s === bestScore) moves.push(i);
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  function minimax(b, maxing, me, opp, depth){
    const w = winner(b);
    if (w) return w.p === me ? 10 - depth : depth - 10;
    if (b.every(Boolean)) return 0;
    let r = maxing ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++){
      if (b[i]) continue;
      b[i] = maxing ? me : opp;
      const s = minimax(b, !maxing, me, opp, depth + 1);
      b[i] = null;
      r = maxing ? Math.max(r, s) : Math.min(r, s);
    }
    return r;
  }

  /* ---------- Pause ---------- */
  function pause(){
    if (!inProgress || !active) return;
    paused = true;
    $('pauseOverlay').classList.add('show');
  }
  function unpause(){
    paused = false;
    $('pauseOverlay').classList.remove('show');
    if (active && isAI(turn) && !locked) aiMove();
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('game').classList.contains('active')){
      paused ? unpause() : pause();
    }
  });

  /* ---------- Buttons ---------- */
  $('btnStart').onclick = () => { updateSetup(); show('setup'); };
  $('btnBackMenu1').onclick = () => show('menu');
  $('btnPlay').onclick = () => { startGame(); $('btnResume').disabled = false; };
  $('btnResume').onclick = () => { if (inProgress){ show('game'); pause(); } };
  $('btnExit').onclick = () => {
    inProgress = false;
    $('btnResume').disabled = true;
    show('exit');
  };
  $('btnReopen').onclick = () => show('menu');
  $('btnPause').onclick = pause;
  $('btnContinue').onclick = unpause;
  $('btnRestart').onclick = () => {
    $('pauseOverlay').classList.remove('show');
    paused = false;
    startGame();
  };
  $('btnToMenu').onclick = () => {
    $('pauseOverlay').classList.remove('show');
    paused = true; // game stays saved for Resume
    show('menu');
    $('btnResume').disabled = false;
  };
  $('btnReplay').onclick = () => { paused = false; newRound(); };
  $('btnNextStage').onclick = () => {
    if (stage < STAGES.length) stage++;
    updateStageBadge();
    paused = false;
    newRound();
  };
  $('btnStartOver').onclick = () => {
    hideGameOver();
    inProgress = false;
    $('btnResume').disabled = true;
    updateSetup();
    show('setup');
  };
  $('btnNext').onclick = () => { if (!paused) newRound(); };

  updateSetup();
})();