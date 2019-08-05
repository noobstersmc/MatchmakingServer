var Redis = require('ioredis');
var redisConnection = new Redis('redis-19702.c15.us-east-1-2.ec2.cloud.redislabs.com', 19702, {password: 'p1p2p3p4p5p6'});

var wait = require('wait.for-es6');
var rp = require('request-promise');

var names = ['TheWillyrex', 'Coriana_', 'moofii', '6uFine', 'zAviee', 'Jqlius', 'taken76', 'puckedd']


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function* sendMatches(){

    for(var name in names){
        var request = yield wait.for(rp, options = {uri: `https://api.mojang.com/users/profiles/minecraft/${names[name]}`});
        if(request.body.length < 2)continue;
        var json = JSON.parse(request.body);
        var matchRequest = {'UUID':`${json.id}`, 'MatchType': 'Unranked', 'LadderType': 'BuildUHC', 'Time': `${Date.now()}`, 'Elo': `${1400 + getRandomInt(100, 200)}`};
        redisConnection.publish('Matchmaking', JSON.stringify(matchRequest));
        console.log(`${names[name]} request sent:\n` + JSON.stringify(matchRequest, null, 2));
    }

    process.exit(1);
}

wait.launchFiber(sendMatches);