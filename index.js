let bodyLoaded = false;
let loadedData;
let score;
let scoreEl;
const bodyLoadedPromise = new Promise(done => {
	window.onload = function() {
		this.createBoard();
		document.getElementsByTagName("name-container")[0].onclick = usernamePrompt;
		document.getElementsByTagName("name")[0].innerText = localStorage.username;
		scoreEl = document.getElementsByTagName("score")[0];
		document.getElementsByTagName("reset-container")[0].onclick = resetGame;
		
		bodyLoaded = true;
		this.console.log(loadedData);
		if (loadedData)
			setGameState(loadedData);
	}
});

let socket;
let submitQueue = [];

newGame();
function newGame() {

	if (socket) {
		socket.done = true;
		socket.close();
	}
	score = 0;
	loadedData = undefined;

	socket = new WebSocket("wss://server.lucasholten.com:21212");
	socket.addEventListener('open', function (e) {
		console.log("opened");

		if (!localStorage.username)
			usernamePrompt();
		this.send('"' + localStorage.username + '"');
	});
	socket.addEventListener('close', function (e) {
		if (!this.done)
			alert("socket disconnect. Please refresh");
	});

	socket.addEventListener('message', function (e) {
		console.log('Message from server ', e);

		loadedData = JSON.parse(e.data);

		if (!this.boardCreated) {
			this.boardCreated = true;
			if (bodyLoaded)
				setGameState(loadedData);
		} else {
			for (let i = 0; i < 5; i++)
				for (let j = 0; j < 5; j++) {
					const cell = board[i][j];
					if (cell.value == "?")
						setCell(cell, loadedData[5*i+j]);
					else if (submitQueue.length == 1 && cell.value != loadedData[5*i+j])
						alert("sumting wrong");
				}
			submitQueue.pop();
			if (submitQueue.length >= 1)
				this.send(submitQueue[0]);
		}
	});
}

function resetGame() {
	if (!loadedData)
		return;
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++)
			setCell(board[i][j], 0);
	newGame();
}

function setGameState(data) {
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++)
			setCell(board[i][j], data[5*i + j]);
}


let board;
function setCell(cell, val) {
	cell.value = val;
	if (val == "?" || val == 0) {
		console.log("yo", cell);
		cell.innerEl.style.setProperty("transition", "none");
		cell.innerEl.style.setProperty("color", "transparent");
		cell.innerEl.offsetHeight; // flush css
		cell.innerEl.style.setProperty("transition", "");
		if (val == 0)
			updateColor(cell);
	} else {
		cell.innerEl.innerText = val;
		cell.innerEl.style.setProperty("color", "");
		updateColor(cell);
	}
}
function updateColor(cell) {
	const COLORS = [[158, 193, 207], [158, 224, 158], [253, 253, 151], [254, 177, 68], [255, 102, 99], [204, 153, 201]];
	let lval = cell.value >= 4 ? Math.min(Math.log2(cell.value) / 2, COLORS.length - 1) : ((cell.value || 2) - 1) / 4;
	for (let i = 1; i < COLORS.length; i++)
		if (--lval <= 0) {
			cell.el.style.setProperty("--bg", "rgb(" + ((1+lval) * COLORS[i][0] - lval * COLORS[i-1][0]) + "," + ((1+lval) * COLORS[i][1] - lval * COLORS[i-1][1]) + "," + ((1+lval) * COLORS[i][2] - lval * COLORS[i-1][2]) + ")");
			return;
		}
}


function usernamePrompt() {
	localStorage.username = prompt("set username");
	while (!localStorage.username)
		localStorage.username = prompt("set username");
	document.getElementsByTagName("name")[0].innerText = localStorage.username;
}


function setDragHandlers(board) {
	
	let dragging = false;
	let selectedCells;
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++) {
			const cell = board[i][j];
			cell.inputEl.onmousedown = cell.inputEl.ontouchstart = function(e) {
				if (cell.value == "?")
					return;
				dragging = true;
				selectedCells = [cell];
				cell.el.classList.add("connected");
				e.preventDefault();
			};

			cell.inputEl.onmouseenter = function(e) {
				if (!dragging)
					return;
				if (cell == selectedCells[selectedCells.length-1].value)
					return;
				if (cell.value != selectedCells[0].value)
					return;
				let index = selectedCells.indexOf(cell);
				if (index >= 0) {
					while (selectedCells.length >= index + 2) {
						const removedCell = selectedCells.pop();
						removedCell.el.classList.remove("connected_" + (removedCell.x - selectedCells[selectedCells.length-1].x) + "_" + (removedCell.y - selectedCells[selectedCells.length-1].y));
						selectedCells[selectedCells.length-1].el.classList.remove("connected_" + (selectedCells[selectedCells.length-1].x - removedCell.x) + "_" + (selectedCells[selectedCells.length-1].y - removedCell.y));
						selectedCells[selectedCells.length-1].el.classList.remove("connected");
					}
					return;
				}

				if (Math.abs(cell.x - selectedCells[selectedCells.length-1].x) + Math.abs(cell.y - selectedCells[selectedCells.length-1].y) != 1)
					return;

				selectedCells[selectedCells.length-1].el.classList.add("connected_" + (selectedCells[selectedCells.length-1].x - cell.x) + "_" + (selectedCells[selectedCells.length-1].y - cell.y));
				cell.el.classList.add("connected_" + (cell.x - selectedCells[selectedCells.length-1].x) + "_" + (cell.y - selectedCells[selectedCells.length-1].y));
				cell.el.classList.add("connected");
				selectedCells.push(cell);
			};
		}
	
	window.ontouchmove = function(e) {
		const el = document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY);
		if (el.tagName == "BOARD-CELL" && board.inputEl.contains(el))
			el.onmouseenter(e);
		e.preventDefault();
	}
	window.onmouseup = window.ontouchend = function(e) {
		if (!dragging)
			return;
		if (selectedCells.length > 1) {
			const scoreIncrease = selectedCells.length * selectedCells[0].value;
			score += scoreIncrease;
			scoreEl.innerText = score;
			for (let i = 0; i < selectedCells.length - 1; i++)
				setCell(selectedCells[i], "?", false);
			setCell(selectedCells[selectedCells.length-1], scoreIncrease);
			const submitTask = JSON.stringify(selectedCells.map(c => 5*c.x + c.y));
			submitQueue.push(submitTask);
			if (submitQueue.length == 1)
				socket.send(submitTask);
		}
		endDrag();
		e.stopPropagation();
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
		for (let cell of selectedCells) {
			cell.el.classList.remove("connected");
			cell.el.classList.remove("connected_-1_0");
			cell.el.classList.remove("connected_1_0");
			cell.el.classList.remove("connected_0_-1");
			cell.el.classList.remove("connected_0_1");
		}
		dragging = false;
		selectedCells = undefined;
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