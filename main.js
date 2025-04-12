import { Room, Generator } from './RoomGenerator.js';
//import seedrandom from 'seedrandom';
console.log(window.seedrandom);


console.log("js loaded");

Math.seedrandom(1.2);

let generator = new Generator(4, false, false, false);
generator.generateMap();
//generator.printMap();

document.addEventListener('DOMContentLoaded', () => { 
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '30px Impact'
    ctx.rotate(0.1)
    ctx.fillText('Awesome!', 50, 100)
});

