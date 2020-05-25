let bodyLoaded = false;
let loadedData;
let score;
let scoreEl;
const bodyLoadedPromise = new Promise(done => {
	window.onload = function() {
		this.createBoard();
		document.getElementsByTagName("name-container")[0].onclick = usernamePrompt;
		setUsername();
		scoreEl = document.getElementsByTagName("score")[0];
		document.getElementsByTagName("reset-container")[0].onclick = resetGame;

		console.log("To create a javascript bot, define a window.bot function. the move function can be used to make a move.");
		
		bodyLoaded = true;
		if (loadedData)
			setGameState(loadedData);
	}
});

let socket;
let submitQueue;


if (!localStorage.username)
	localStorage.username = "Noname brain";

newGame();
function newGame() {

	if (socket) {
		socket.done = true;
		socket.close();
	}
	score = 0;
	loadedData = undefined;

	submitQueue = [];

	socket = new WebSocket("wss://server.lucasholten.com:21212");
	socket.addEventListener('open', function (e) {
		this.send('"' + localStorage.username + '"');
	});
	socket.addEventListener('close', function (e) {
		if (!this.done) {
			alert("socket disconnected. Sorry!");
			resetGame();
		}
	});

	socket.addEventListener('message', function (e) {

		loadedData = JSON.parse(e.data);

		if (!this.boardCreated) {
			this.boardCreated = true;
			if (bodyLoaded)
				setGameState(loadedData);
		} else {
			submitQueue.shift();
			for (let i = 0; i < 5; i++) {
				dataInput:
				for (let j = 0; j < 5; j++) {
					const cell = board[i][j];
					if (cell.value == "?") {
						for (let submitTask of submitQueue)
							if (submitTask.includes(cell))
								continue dataInput;
						setCell(cell, loadedData[5*i+j]);
					} else if (submitQueue.length == 1 && cell.value != loadedData[5*i+j]) {
						for (let submitTask of submitQueue)
							if (submitTask[submitTask.length - 1] == cell)
								continue dataInput;
						console.error(cell, "is", cell.value, "but server says", loadedData[5*i+j]);
						setCell(cell, loadedData[5*i+j]);
					}
				}
			}
			if (submitQueue.length >= 1) {
				this.sendTask();
				return;
			} else {
				endGameCheck:
				while (!this.done) {
					for (let i = 0; i < 5; i++)
						for (let j = 0; j < 4; j++)
							if (board[i][j].value == board[i][j+1].value)
								break endGameCheck;
					for (let i = 0; i < 4; i++)
						for (let j = 0; j < 5; j++)
							if (board[i][j].value == board[i+1][j].value)
								break endGameCheck;
					this.done = true;
					gameOver();
					return;
				}
			}
		}
		
		if (window.bot)
			window.bot(board);
	});

	socket.sendTask = function() {
		if (this.readyState >= WebSocket.CLOSING)
			return this.close();
		this.send(JSON.stringify(submitQueue[0].map(c => 5*c.x + c.y)));
	};
}

function gameOver() {
	alert("Game over, you scored " + score + "!");
	resetGame();
}

function resetGame() {
	if (!loadedData)
		return;
	registerScore(score);
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++)
			setCell(board[i][j], 0);
	newGame();
	scoreEl.innerText = score;
}

window.onbeforeunload = function(e) {
	if (loadedData)
		registerScore(score);
};

function registerScore(score) {
	if (!(parseInt(localStorage.highScore) >= score))
		localStorage.highScore = score;
	localStorage.allScores = localStorage.allScores ? localStorage.allScores + "|" + score : score;
}

function setGameState(data) {
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++)
			setCell(board[i][j], data[5*i + j]);
}


let board;
function setCell(cell, val) {
	cell.value = val;
	if (val == "?") {
		cell.innerEl.style.setProperty("transition", "none");
		cell.innerEl.style.setProperty("color", "transparent");
		cell.innerEl.offsetHeight; // flush css
		cell.innerEl.style.setProperty("transition", "");
		updateColor(cell);
	} else {
		if (val > 0) {
			cell.innerEl.innerText = val;
			cell.innerEl.style.setProperty("color", "");
		} else
			cell.innerEl.style.setProperty("color", "transparent");
		if (val >= 10000)
			cell.innerEl.style.setProperty("--font-scale", 0.48);
		else if (val >= 1000)
			cell.innerEl.style.setProperty("--font-scale", 0.6);
		else if (val >= 100)
			cell.innerEl.style.setProperty("--font-scale", 0.8);
		else
			cell.innerEl.style.setProperty("--font-scale", 1);
		updateColor(cell);
	}
}

function updateColor(cell) {
	const COLORS = [[158, 193, 207], [158, 224, 158], [253, 253, 151], [254, 177, 68], [255, 102, 99], [204, 153, 201], [158, 193, 207]];
	const val = cell.value == "?" ? 0 : cell.value;
	let lval = val >= 4 ? Math.min(Math.log2(val) / 2, COLORS.length - 1) : ((val || 2) - 1) / 4;
	lval = lval % 6;
	for (let i = 1; i < COLORS.length; i++)
		if (--lval <= 0) {
			cell.el.style.setProperty("--bg", "rgb(" + ((1+lval) * COLORS[i][0] - lval * COLORS[i-1][0]) + "," + ((1+lval) * COLORS[i][1] - lval * COLORS[i-1][1]) + "," + ((1+lval) * COLORS[i][2] - lval * COLORS[i-1][2]) + ")");
			return;
		}
}

function setUsername() {
	const nameEl = document.getElementsByTagName("name")[0];
	nameEl.style.setProperty("--font-scale", 1);
	nameEl.offsetWidth; // flush css
	nameEl.innerText = localStorage.username;
	nameEl.style.setProperty("--font-scale", Math.min(1, 207/nameEl.offsetWidth));
}

function usernamePrompt(noReset) {
	let newUsername;
	while ((!localStorage.username && (newUsername === null || newUsername === undefined || newUsername.length == 0)) || newUsername === undefined)
		newUsername = prompt("Change username");
	if (newUsername === null || newUsername.length == 0 || newUsername == localStorage.username)
		return;
	localStorage.username = newUsername;
	setUsername();
	if (noReset !== true)
		resetGame();
}


function setDragHandlers(board) {
	
	let dragging = false, wasDragging = false;
	let contextMenu = false;
	let lastIsReverseClick = false;
	let selectedCells;
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++) {
			const cell = board[i][j];
			cell.inputEl.onmousedown = function (e) {
				if (!dragging && (e.button == 0 || e.button == 2)) {
					lastIsReverseClick = e.button == 2;
					if (e.button == 2)
						contextMenu = true;
					return startDrag(e);
				}
			}
			cell.inputEl.ontouchstart = function(e) {
				lastIsReverseClick = false;
				if (!dragging && e.touches.length == 1)
					return startDrag(e);
			}
			function startDrag(e) {
				if (cell.value == "?" || cell.value <= 0)
					return;
				dragging = true;
				selectedCells = [[cell]];
				cell.el.classList.add("connected");
				e.preventDefault();
				e.stopPropagation();
			}

			cell.inputEl.onmouseenter = function(e) {
				if (!dragging)
					return;
				const lastMove = selectedCells[selectedCells.length-1];
				if (cell == lastMove[lastMove.length-1].value)
					return;
				for (let i = 0; i < selectedCells.length; i++) {
					const move = selectedCells[i];
					let index = move.indexOf(cell);
					if (index < 0)
						continue;
					while (move.length >= index + 2) {
						const removedCell = move.pop();
						removedCell.el.classList.remove("connected_" + (removedCell.x - move[move.length-1].x) + "_" + (removedCell.y - move[move.length-1].y));
						move[move.length-1].el.classList.remove("connected_" + (move[move.length-1].x - removedCell.x) + "_" + (move[move.length-1].y - removedCell.y));
						move[move.length-1].el.classList.remove("connected");
					}
					for (let j = selectedCells.length; --j > i;) {
						const move = selectedCells.pop();
						for (let k = 1; k < move.length; k++) {
							const removedCell = move[k];
							const nextCell = move[k-1];
							removedCell.el.classList.remove("connected_" + (removedCell.x - nextCell.x) + "_" + (removedCell.y - nextCell.y));
							nextCell.el.classList.remove("connected_" + (nextCell.x - removedCell.x) + "_" + (nextCell.y - removedCell.y));
							nextCell.el.classList.remove("connected");
						}
					}
					return;
				}

				if (Math.abs(cell.x - lastMove[lastMove.length-1].x) + Math.abs(cell.y - lastMove[lastMove.length-1].y) != 1)
					return;
				
				if (cell.value != lastMove[lastMove.length-1].value && cell.value != selectedCells[0][0].value * selectedCells.map(m => m.length).reduce((a, b) => a * b))
					return;
				lastMove[lastMove.length-1].el.classList.add("connected_" + (lastMove[lastMove.length-1].x - cell.x) + "_" + (lastMove[lastMove.length-1].y - cell.y));
				cell.el.classList.add("connected_" + (cell.x - lastMove[lastMove.length-1].x) + "_" + (cell.y - lastMove[lastMove.length-1].y));
				cell.el.classList.add("connected");
				if (cell.value == lastMove[lastMove.length-1].value)
					lastMove.push(cell);
				else 
					selectedCells.push([lastMove[lastMove.length-1], cell]);
			};
		}
	
	window.onmousedown = function (e) {
		if (!dragging)
			return;
		if (e.button == 2 || e.button == 0) {
			lastIsReverseClick = e.button == 2;
			return finishDrag(e);
		}
	}

	window.ontouchstart = function(e) {
		if (dragging && e.touches.length > 1) {
			lastIsReverseClick = true;
			return finishDrag(e);
		}
	}
	window.oncontextmenu = function(e) {
		const result = !dragging && !wasDragging;
		wasDragging = false;
		return result;
	};
	window.onmousemove = _ => contextMenu = false;
	let lastMoveEl;
	window.ontouchmove = function(e) {
		const el = document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY);
		if (el == lastMoveEl)
			return;
		lastMoveEl = el;
		if (el.tagName == "BOARD-CELL" && board.inputEl.contains(el))
			el.onmouseenter(e);
		e.preventDefault();
	}
	window.onmouseup = window.ontouchend = finishDrag;
	function finishDrag(e) {
		if (!dragging)
			return;
		if (lastIsReverseClick)
			selectedCells[selectedCells.length - 1] = selectedCells[selectedCells.length - 1].reverse();
		doMoves(selectedCells);
		endDrag();
		e.stopPropagation();
	};
	window.move = function(m) {
		try {
			if (dragging)
				throw new Error("Cannot do bot move now, user is doing a move");
			if (submitQueue.length > 0)
				throw new Error("Still executing last move! Preventing double move");
			if (m.length < 2)
				throw new Error("Move is too short!");
			const move = m.map(c => board[c.x][c.y]);
			let last = move[0];
			for (let i = 1; i < move.length; i++) {
				const curr = move[i];
				if (Math.abs(last.x - curr.x) + Math.abs(last.y - curr.y) != 1)
					throw new Error("Illegal move! Chain not connected");
				if (last.value != curr.value)
					throw new this.Error("Illegal move! Blocks don't have the same value");
				for (let j = 0; j < i; j++)
					if (curr == move[j])
						throw new Error("Illegal move! A block was reused");
				last = curr;
			}
			return doMoves([move]);
		} catch (err) {
			console.error(m);
			throw err;
		}
	};
	function doMoves(moves) {
		const lastMove = moves[moves.length-1];
		if (lastMove.length > 1) {
			let scoreIncrease = moves[0][0].value;
			for (let move of moves) {
				scoreIncrease *= move.length;
				score += scoreIncrease;
				for (let i = 0; i < move.length - 1; i++)
					setCell(move[i], "?", false);
			}
			setCell(lastMove[lastMove.length-1], scoreIncrease);
			scoreEl.innerText = score;
			const queueEmpty = submitQueue.length == 0;

			submitQueue.push(...moves);
			if (queueEmpty)
				socket.sendTask();
		}
	};
	window.onblur = function(e) {
		if (!dragging)
			return;
		endDrag();
	};
	window.onkeydown = function(e) {
		if (!dragging)
			return;
		if (e.code == "Escape")
			endDrag();
	};
	function endDrag() {
		for (let move of selectedCells)
			for (let cell of move) {
				cell.el.classList.remove("connected");
				cell.el.classList.remove("connected_-1_0");
				cell.el.classList.remove("connected_1_0");
				cell.el.classList.remove("connected_0_-1");
				cell.el.classList.remove("connected_0_1");
			}
		dragging = false;
		selectedCells = undefined;
		if (!contextMenu)
			wasDragging = true;
	}

}


function createBoard() {
	const containerEl = document.getElementById("board-container");
	containerEl.innerHTML = "";

	const boardEl = document.createElement("board");
	const renderEl = document.createElement("board-render");
	const animationEl = document.createElement("board-animation");
	const inputEl = document.createElement("board-input");
	board = [];
	board.el = boardEl;
	board.renderEl = renderEl;
	board.animationEl = animationEl;
	board.inputEl = inputEl;

	for (let i = 0; i < 5; i++) {
		const rowEl = document.createElement("board-row");
		const rowInputEl = document.createElement("board-row");
		const row = [];
		for (let j = 0; j < 5; j++) {
			const cellEl = document.createElement("board-cell");
			const cellInnerEl = document.createElement("board-cell-inner");
			cellInnerEl.style.setProperty("color", "transparent");
			const cellInputEl = document.createElement("board-cell");
			const cell = {
				x: i,
				y: j,
				el: cellEl,
				innerEl: cellInnerEl,
				inputEl: cellInputEl,
				value: undefined
			}
			cellEl.style.setProperty("--val", 0);
			
			updateColor(cell);
			row[j] = cell;
			cellEl.appendChild(cellInnerEl);
			rowEl.appendChild(cellEl);
			rowInputEl.appendChild(cellInputEl);
		}
		
		board[i] = row;
		renderEl.appendChild(rowEl);
		inputEl.appendChild(rowInputEl);
	}

	boardEl.appendChild(renderEl);
	boardEl.appendChild(animationEl);
	boardEl.appendChild(inputEl);

	setDragHandlers(board);	

	containerEl.appendChild(boardEl);
	return board;
}