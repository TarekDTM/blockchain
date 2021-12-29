var express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain')
const uuid = require('uuid/v1');
const tarekcoin = new Blockchain();
const nodeAddress = uuid().split('-').join('');
const port = process.argv[2];
const rp = require('request-promise');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}))


app.get('/tarekcoin',function (req,res) {
    res.send(tarekcoin);
});

app.post('/transaction',function (req, res) {
 const blockIndex =  tarekcoin.createNewTransaction(req.body.amount,req.body.sender,req.body.recipient)
res.json({note: `Transaction will be added in block ${blockIndex}.`})
});

app.get('/mine' ,function(req,res) {
    const lastBlock = tarekcoin.getLastBlock();
    const previousBlockhash = lastBlock['hash'];
    const currentBlockData = {
        transactions:tarekcoin.pendingTransactions,
        index:lastBlock['index']+1
    }
    const nonce = tarekcoin.proofOfWork(previousBlockhash,currentBlockData);
    const blockHash =tarekcoin.hashBlock(previousBlockhash,currentBlockData,nonce);
    tarekcoin.createNewTransaction(12.5,"00",nodeAddress);
    const newBlock = tarekcoin.createNewBlock(nonce,previousBlockhash,blockHash);
    res.json({
        note:"New Block mine succesfully",
        block : newBlock
    });
});
app.post('/register-and-broadcast-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;

    if (tarekcoin.networkNodes.indexOf(newNodeUrl) == -1) tarekcoin.networkNodes.push(newNodeUrl);
    const regNodesPromises = [];

    tarekcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: { newNodeUrl: newNodeUrl },
            json: true
        };

        regNodesPromises.push(rp(requestOptions));
        
    });
    Promise.all(regNodesPromises).then(data => {
            const bulkRegisterOptions = {
                uri: newNodeUrl + '/register-node-bulk',
                method: 'POST',
                body: { allNetworkNodes: [...tarekcoin.networkNodes, tarekcoin.currentNodeUrl] },
                json: true

            };
            console.log(bulkRegisterOptions)
            return rp(bulkRegisterOptions);
        }).then(data => {
        res.json({ note: 'New node registered with network successfully' });
    });
});

app.post('/register-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const notCurrentNode = tarekcoin.currentNodeUrl !== newNodeUrl;
    const nodeNotAlreadyPresent = tarekcoin.networkNodes.indexOf(newNodeUrl) == -1;
    if (nodeNotAlreadyPresent && notCurrentNode) tarekcoin.networkNodes.push(newNodeUrl);
    res.json({ note: 'new node registered successfully with node.' })

});

app.post('/register-node-bulk', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(newNodeUrl => {
        const nodeNotAlreadyPresent = tarekcoin.networkNodes.indexOf(newNodeUrl) == -1;
        const notCurrentNode = tarekcoin.currentNodeUrl !== newNodeUrl;
        if (nodeNotAlreadyPresent && notCurrentNode) tarekcoin.networkNodes.push(newNodeUrl)
    })
    res.json({note:'Bulk registration successful.'})
});

app.listen(port,function () {
    console.log(`listening on port ${port}...`)
});
