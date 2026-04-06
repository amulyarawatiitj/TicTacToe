const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function getWinCells(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return [a,b,c];
    }
  }
  return [];
}

export default function Board({ board, onMove, disabled, mySymbol }) {
  const winCells = getWinCells(board);

  return (
    <div className="board-grid">
      {board.map((cell, i) => {
        const isWin   = winCells.includes(i);
        const isEmpty = cell === "";
        const cls     = [
          "cell",
          cell ? "taken" : "",
          cell === "X" ? "x" : cell === "O" ? "o" : "",
          isWin ? "win-cell" : "",
          (disabled || !isEmpty) ? "disabled" : "",
        ].join(" ").trim();

        return (
          <div
            key={i}
            className={cls}
            onClick={() => {
              if (!disabled && isEmpty) onMove(i);
            }}
          >
            {cell}
          </div>
        );
      })}
    </div>
  );
}
