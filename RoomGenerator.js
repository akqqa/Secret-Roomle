// So the basic plan is:
// Randomly select a floor, curse if applicable, etc ( do lter, for now, just do most basic as poc )
// Randomly gen the number of rooms
// Select the min dead ends
// Generate according to the original script, and then verify it fits on the grid and has at least min dead ends
// Perform logic for boss room, treasure room, etc if wanted
// secret rooms when required
// thats the generator done! can buildother stuf on top later
// large rooms and such arent necessary. cause gameplay doesnt matter rn lol m- this is basic. worst case can add later if really want to but not well documented.
// ^ issue here is that, this algorithm wont have rock info and stuff, so.. its not super useful. but - again we dont know the game so would have to fake it anyway e.g select certain rooms that we know arent next to a secret room and say they have rocks on that side etc. - thats for gamifying it later
// It doesnt have to be perfect :) its jsut for fun !!! and for a small project to get you back into coding for fun like uni
// Can add ultra secret once done for extra challenge, will require red rooms filling all empty space, then using connection rules
// Gameplay can be like, first guess is nothing, each fail reveals new info such as boss room, rooms with blocked sides, etc.

// Using https://bindingofisaacrebirth.fandom.com/wiki/Level_Generation and https://www.boristhebrave.com/2020/09/12/dungeon-generation-in-binding-of-isaac/ for algorithm

// Can be boss, secret, shop, etc etc etc
class Room{

}

class Generator {
    constructor(stage, labyrinth, lost, hard) {
        this.stage = stage;
        this.labyrinth = labyrinth;
        this.lost = lost;
        this.hard = hard;
        this.numRooms = this.generateNumRooms();
        this.minDeadEnds = this.generateMinDeadEnds();
        this.map = [...Array(13)].map(e => Array(13));
    }

    generateNumRooms() {
        // Create number of rooms on stage
        let numRooms = Math.min(20, Math.floor(Math.random(0,1)*2) + 5 + Math.floor(this.stage * (10 / 3)));
        if (this.labyrinth) {
            numRooms = Math.min(45, Math.floor(numRooms * 1.8));
        } else if (this.lost) {
            numRooms += 4;
        }
        // Void check
        if (this.stage == 12) {
            numRooms = 50 + Math.floor(Math.random() * 10);
        }
        // Hard mode check
        if (this.hard) {
            numRooms += 2 + Math.floor(Math.random(0,1)*2);
        }
        console.log(numRooms);
        return numRooms;
    }

    generateMinDeadEnds() {
        // Number of dead ends (minimum)
        let minDeadEnds = 5;
        if (this.stage != 1) {
            minDeadEnds += 1;
        }
        if (this.labyrinth) {
            minDeadEnds += 1;
        }
        if (this.stage == 12) {
            minDeadEnds += 2;
        }
        console.log(minDeadEnds);
        return minDeadEnds;
    }

    
    generateMap() { // Considered a separate map class, but no real point tbh since itd have to pass half the stuff anyway
        // Start at center square
        let center = [6, 6]

    }
 
}

let generator = new Generator(2, false, false, false);
console.log(generator.map);
generator.generateMap;






// Room Generation Algorithm:
// Create 13x13 grid, worm around placing rooms, and track dead ends in a queue.
