const socket = new WebSocket("wss://server.lucasholten.com:21212");

const bodyLoadedPromise = new Promise(done => {
	window.onload = function() {
		this.createBoard();
	}
	done();
});

socket.addEventListener('open', function (e) {
	console.log("opened");

	socket.send('"my name jeff"');
});
socket.addEventListener('close', function (e) {
	alert("fuck");
});

socket.addEventListener('message', function (e) {
	console.log('Message from server ', e);

	bodyLoadedPromise.then(_ => {
		const data = JSON.parse(e.data);
		for (let i = 0; i < 5; i++)
			for (let j = 0; j < 5; j++)
				setCell(i, j, data[5*i + j]);
	});
});


let board;
function setCell(x, y, val) {
	board[x][y].value = val;
	board[x][y].el.innerText = val;
	updateColor(board[x][y]);
}
function updateColor(cell) {
	const COLORS = [[158, 193, 207], [158, 224, 158], [253, 253, 151], [254, 177, 68], [255, 102, 99], [204, 153, 201]];
	let lval = cell.value >= 4 ? Math.min(Math.log2(cell.value) / 2, COLORS.length - 1) : ((cell.value || 2) - 1) / 4;
	for (let i = 1; i < COLORS.length; i++)
		if (--lval <= 0) {
			cell.el.style.setProperty("background-color", "rgb(" + ((1+lval) * COLORS[i][0] - lval * COLORS[i-1][0]) + "," + ((1+lval) * COLORS[i][1] - lval * COLORS[i-1][1]) + "," + ((1+lval) * COLORS[i][2] - lval * COLORS[i-1][2]) + ")");
			return;
		}
}


function setDragHandlers(board) {
	
	let dragging = false;
	let selectedCells;
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++) {
			const cell = board[i][j];
			cell.inputEl.onmousedown = cell.inputEl.ontouchstart = function(e) {
				console.log("touch start");
				dragging = true;
				selectedCells = [cell];
				cell.el.classList.add("connected");
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
		if (el.tagName == "board-cell" && board.inputEl.contains(el))
			el.onmouseenter(e);
	}
	window.onmouseup = window.ontouchend = function(e) {
		console.log("touch exit");
		if (!dragging)
			return;
		if (selectedCells.length > 1) {
			socket.send(JSON.stringify(selectedCells.map(c => 5*c.x + c.y)));
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
			const cellInputEl = document.createElement("board-cell");
			const cell = {
				x: i,
				y: j,
				el: cellEl,
				inputEl: cellInputEl,
				value: undefined
			}
			
			updateColor(cell);
			row[j] = cell;
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