import { Room, Generator } from './RoomGenerator.js';
//import seedrandom from 'seedrandom';
console.log(window.seedrandom);


console.log("js loaded");

Math.seedrandom(1.2);

let generator = new Generator(4, false, false, false);
generator.generateMap();
//generator.printMap();

// Issue with this loading after the domcontentloaded and thus not showing. ugh. need promises or async or smth
const emptyRoom = new Image();
emptyRoom.src = "images/emptyRoom.png"

document.addEventListener('DOMContentLoaded', () => { 
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    for (let x = 30; x < 420; x += 30) {
        for (let y = 30; y < 420; y += 30) {
            ctx.drawImage(emptyRoom, x, y, 30, 30);
        }
    }

});

