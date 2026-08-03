const fs = require('fs');
let lines = fs.readFileSync('css/style.css', 'utf8').split('\n');
lines = lines.slice(0, 1805); // Keep up to line 1805 (the closing brace } at 1804 and one empty line)
const css = `
/* In-World Map Stand */
#in-world-map-stand {
    position: absolute;
    pointer-events: none;
    z-index: 5;
    perspective: 600px;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translateX(-50%) translateY(-100%);
}

.stand-board {
    width: 60px;
    height: 100px;
    background: #a33e36;
    border: 3px solid #6b231d;
    border-radius: 2px;
    transform: rotateY(-45deg);
    transform-style: preserve-3d;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -4px 6px 8px rgba(0,0,0,0.5);
}

.stand-paper {
    width: 46px;
    height: 80px;
    background: #f4e8c1;
    border: 1px solid #c2b280;
    transform: translateZ(2px);
    box-shadow: inset 0 0 5px rgba(0,0,0,0.1);
    overflow: hidden;
}

.stand-post {
    width: 8px;
    height: 30px;
    background: #5c3a21;
    border-left: 2px solid #362213;
    border-right: 2px solid #362213;
    box-shadow: -2px 2px 4px rgba(0,0,0,0.4);
    margin-top: -2px;
}
`;
lines.push(css);
fs.writeFileSync('css/style.css', lines.join('\n'));
console.log("CSS fixed successfully.");
