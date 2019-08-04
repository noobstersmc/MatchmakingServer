var Redis = require('ioredis');
var subscriber = new Redis('redis-19702.c15.us-east-1-2.ec2.cloud.redislabs.com', 19702, {password: 'p1p2p3p4p5p6'});
var pub = subscriber.duplicate();
var wait = require('wait.for-es6');

subscriber.subscribe("Matchmaking");


/**
 * Structure:
 * When a player requests to join the queue, the player is added to an either ranked or unranked sorted set.
 * While being added to the sorted set, the player's score has to be set to the ZCARD(size of the set) to be put at the end of the queue 
 * OR add player with 0 score and everytime the matchmaking runs add 1 or whatever time in milliseconds.
 * 
 * The player will also be added to a redis hash which stores all the player data and its matchmaking parameters
 * 
 * MatchMaking:
 * The matchmaking will be run in two different tasks: unranked and ranked.
 * 
 * Ranked will look at the sorted set and get all the members with ZRANGE(0 -1) // ZREVRANGE gets from highest to lowest BTW
 * then it will ask EACH redis hash for the player's matchmaking settings and store the data IN ORDER in a more legible, maybe json format.
 * 
 * Once the data has been converted over to something more legible, the matchmaking will start looping in order through every single player and it's match
 * making settings. The algorythm will analyze the player's ELO, then it will grab the amount of time they have been in a queue and for each second queued
 * it will offset the elo for 10 points. For instance, if a player has 1232 ELO and then joins matchmaking for 5 seconds, the algoryth will look for oponents
 * in the range of 1182 - 1282 of ELO.
 * If an opponent is found, the matchmaking will then look for an available match-map and grab it's ID+BungeeServerName, remove both players from the queue and
 * send a message to the lobby server that a match has been found for them. Everything thereafter is handled by the ArenaRecieveModule in Java
 * 
 * 
 * Unranked is way simpler, the task will look at its sorted set and get all the members with ZRANGE(0-1)
 * Then, it will ask EACH redis hash for the matchmaking settings and store data in a more legible way. Since it's unranked just one value is required
 * which is the LadderType.
 * 
 * Once data is converted, the matchmaking will loop through every single player and what ladder they're matchmaking for.
 * If a matching oponent is found, then both players will be removed from queue, and the lobby server will be informed and thereafter send the data to the 
 * ArenaRecieveModule to handle it.
 */

 
subscriber.on("message", function(channel, message) {
   var json = JSON.parse(message);

   pub.hmset(`Player:${json.UUID}`, 'UUID', json.UUID, 'MatchType', json.MatchType, 'LadderType', json.LadderType, 'Elo', json.Elo, 'Time', json.Time).then(function(result){
      console.log(result);
      pub.zadd('rankSet', 0,json.UUID).then(function(result2){
         console.log(result2);
      },function(err){
         console.log(err);
      });

   }, function(err){
      console.log(err);
   });
});



function sortResults(prop, asc) {
   people.sort(function(a, b) {
       if (asc) {
           return (a[prop] > b[prop]) ? 1 : ((a[prop] < b[prop]) ? -1 : 0);
       } else {
           return (b[prop] > a[prop]) ? 1 : ((b[prop] < a[prop]) ? -1 : 0);
       }
   });
   renderResults();
}

function* getPlayerSet(){
   var collection = yield wait.forMethod(pub, 'zrevrange', 'rankSet', start = 0, end =-1);

   var json = JSON.parse('{"users":{}}');

   for (var uuid of collection){
      var getJson = yield wait.forMethod(pub, 'hgetall', `Player:${uuid}`);
      var newUser = String(uuid);
      json.users[newUser] = getJson;
   }

   console.log(json);

}



setInterval(function(){
   wait.launchFiber(getPlayerSet);

}, 500);