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

// Using https://bindingofisaacrebirth.fandom.com/wiki/Level_Generation and https://www.boristhebrave.com/2020/09/12/dungeon-generation-in-binding-of-isaac/ for algorithm

var stage = 4;
var labyrinth = true;
var lost = false;
var hard = false;

// Create number of rooms on stage
var numRooms = Math.min(20, Math.floor(Math.random(0,1)*2) + 5 + Math.floor(stage * (10 / 3)));
if (labyrinth) {
    numRooms = Math.min(45, Math.floor(numRooms * 1.8));
} else if (lost) {
    numRooms += 4;
}
// Void check
if (stage == 12) {
    numRooms = 50 + Math.floor(Math.random() * 10);
}
// Hard mode check
if (hard) {
    numRooms += 2 + Math.floor(Math.random(0,1)*2);
}
console.log(numRooms);

