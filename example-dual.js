const PROTO_PATH = __dirname + '/protos/WandService.proto';
const WAND_1_LABEL = "wand1";
const WAND_2_LABEL = "wand2";

var noble = require('noble');
const KanoWand = require('./index')
const kanoInfo = require('./kano_info.json');
var grpc = require('grpc');
var protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
var wand_proto = grpc.loadPackageDefinition(packageDefinition).duelingfundamentals;

var client = new wand_proto.WandService('localhost:60051', grpc.credentials.createInsecure());

var wand1 = new KanoWand();
var wand2 = new KanoWand();

noble.on('stateChange', function (state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function (peripheral) {
  let deviceName = peripheral.advertisement.localName || "";
  if (deviceName.startsWith("Kano-Wand") && !wand1.name) {
    console.log("Found wand1 with name", deviceName);

    peripheral.connect(function (error) {
      wand1.init(peripheral, "Wand_1 (" + deviceName + ")")
        .then(() => {
          wand1.vibrate(kanoInfo.PATTERN.REGULAR);
          wand1.spells.subscribe((spell) => {
            console.log(wand1.name, spell);
            client.castSpell({ name: spell.spell, wand: WAND_1_LABEL}, function (err, response) {
              if (!err && response) {
                console.log('Response to castSpell from server:', response.message);
              } else {
                console.error('Error response to castSpell from server:', err)
              }
            });
          });

          wand1.onWandMove.subscribe((obj) => {
            client.wandMove({wand: WAND_1_LABEL, position: {x: obj.x, y: obj.y}, isButtonPressed: obj.isButtonPressed}, function (err, response) {
              if (!err && response) {
                // Useful for debugging, but very verbose
                //console.log('Response to wandMove from server:', response.message);
              } else {
                console.error('Error response to wandMove from server:', err)
              }
            });
          });
        });
    });
  }
  else if (deviceName.startsWith("Kano-Wand") && !wand2.name) {
    noble.stopScanning();
    console.log("Found wand2 with name", deviceName);

    peripheral.connect(function (error) {
      wand2.init(peripheral, "Wand_2 (" + deviceName + ")")
        .then(() => {
          wand2.vibrate(kanoInfo.PATTERN.REGULAR, () => {
            // Vibrate again for the second wand
            setTimeout(() => {
              wand2.vibrate(kanoInfo.PATTERN.REGULAR)
            }, 500);
          });
          wand2.spells.subscribe((spell) => {
            console.log(wand2.name, spell);
            client.castSpell({ name: spell.spell, wand: WAND_2_LABEL, positions: spell.positions.map(([x, y]) => { return { x: x, y: y } }) }, function (err, response) {
              if (!err && response) {
                console.log('Response to castSpell from server:', response.message);
              } else {
                console.error('Error response to castSpell from server:', err)
              }
            });
          });

          wand2.onWandMove.subscribe((obj) => {
            client.wandMove({wand: WAND_2_LABEL, position: {x: obj.x, y: obj.y}, isButtonPressed: obj.isButtonPressed}, function (err, response) {
              if (!err && response) {
                // Useful for debugging, but very verbose
                //console.log('Response to wandMove from server:', response.message);
              } else {
                console.error('Error response to wandMove from server:', err)
              }
            });
          });
        });
    });
  }
});

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') {
    process.exit();
  } else {
    wand1.reset_position();
    wand2.reset_position();
  }
});
