var Redis = require('ioredis');
var subscriber = new Redis('redis-19702.c15.us-east-1-2.ec2.cloud.redislabs.com', 19702, {password: 'p1p2p3p4p5p6'});
var pub = subscriber.duplicate();
var wait = require('wait.for-es6');

subscriber.subscribe("Matchmaking");

 
subscriber.on("message", function(channel, message) {
   var json = JSON.parse(message);

   pub.hmset(`Player:${json.UUID}`, 'UUID', json.UUID, 'MatchType', json.MatchType, 'LadderType', json.LadderType, 'Elo', json.Elo, 'Time', json.Time).then(function(result){
      console.log(result);
      pub.zadd('rankSet', 0, json.UUID).then(function(result2){
         console.log(result2);
      },function(err){
         console.log(err);
      });

   }, function(err){
      console.log(err);
   });
});


function* getPlayerSet(){
   var collection = yield wait.forMethod(pub, 'zrevrange', 'rankSet', start = 0, end =-1);
   
   var other = [];

   for (var uuid of collection){
      var getJson = yield wait.forMethod(pub, 'hgetall', `Player:${uuid}`);
      other.push(getJson);
   }
   
   
   other.sort(function(a, b){
      return a.Time - b.Time;
   });

   var ranked = new Set();

   var unranked = new Set();
   
   
   other.forEach(function(element){
      if(element.MatchType == 'Ranked'){
         ranked.add(element);
      }else{         
         unranked.add(element);
      }
   });
   handleMatchmakingRanked(ranked);
   handleMatchmakingUnranked(unranked);
}

function handleMatchmakingRanked(playerCollection){
   if(playerCollection.size == 0)return;
   for(var obj of playerCollection){    
      var offset = parseInt(((Date.now() - obj.Time)/ 1000)) * 10;
      for(var aname of playerCollection){   
         if(aname == obj)continue;
         if(aname.MatchType != obj.MatchType)continue;
         if(!between(aname.Elo, obj.Elo - offset, obj.Elo + offset))continue;
         var offset2 = parseInt(((Date.now() - aname.Time)/ 1000)) * 10;
         if(!between(obj.Elo, aname.Elo- offset2, aname.Elo + offset2))
         playerCollection.delete(obj);
         playerCollection.delete(aname);
         pub.zrem('rankSet', aname.UUID, obj.UUID);
         console.log(`${obj.MatchType} ${obj.LadderType} Found:\n` + aname.Elo + " and " + obj.Elo);
         break;
      }
   }
}

function handleMatchmakingUnranked(playerCollection){
   if(playerCollection.size == 0)return;   
   for(var obj of playerCollection){
      for(var aname of playerCollection){   
         if(aname == obj)continue;
         if(aname.MatchType != obj.MatchType)continue;
         playerCollection.delete(obj);
         playerCollection.delete(aname);
         pub.zrem('rankSet', aname.UUID, obj.UUID);
         console.log(`${obj.MatchType} ${obj.LadderType} Found:\n` + aname.UUID + " and " + obj.UUID);

         var matchID = `game-${Math.random().toString(36).substring(2, 8)}`;

         var matchFound = {'MatchID': matchID, 'Player-1': obj, 'Player-2': aname};
         
         pub.publish('MatchFound', JSON.stringify(matchFound));
         break;
      }
   }

}

function between(x, min, max) {
   return x >= min && x <= max;
 }

setInterval(function(){
   wait.launchFiber(getPlayerSet);

}, 500);