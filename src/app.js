'use strict';

const { App } = require('jovo-framework');
const { Alexa } = require('jovo-platform-alexa');
const { GoogleAssistant } = require('jovo-platform-googleassistant');
const { JovoDebugger } = require('jovo-plugin-debugger');
const { FileDb } = require('jovo-db-filedb');

// ------------------------------------------------------------------
// APP INITIALIZATION
// ------------------------------------------------------------------

const app = new App();

app.use(
  new Alexa(),
  new GoogleAssistant(),
  new JovoDebugger(),
  new FileDb()
);

//GOOGLE SPREADSHEET CONFIG
const { GoogleSpreadsheet } = require('google-spreadsheet');
// spreadsheet key is the long id in the sheets URL
const doc = new GoogleSpreadsheet('1vvNhhzNIq2thCVEU6zMvNnS1w3XQW7gY5xRZ_ANqFzU');

// ------------------------------------------------------------------
// APP LOGIC
// ------------------------------------------------------------------


app.setHandler({
  async ON_REQUEST() {
    await doc.useServiceAccountAuth(require('./google-sheets-credentials.json'));
    console.info('signed into sheets')
    await doc.loadInfo(); // loads sheets

  },
  async LAUNCH() {
    // load directly from json file if not in secure environment
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const rowCount = rows.length;
    this.$session.$data.isClockIn = rows[rowCount - 1].Departure || (rows[rowCount - 1].Date != getDate());
    console.log(rows[rowCount - 1].Date);
    console.log(getDate());
    console.log(this.$session.$data.isClockIn);
    if (this.$session.$data.isClockIn) {
      this.$speech.addAudio("https://firebasestorage.googleapis.com/v0/b/voice-first-tech.appspot.com/o/Projects%2FSweets-Timesheet-Voice-Assistant%2Fholding_welcome.clockin.mp3?alt=media", "Welcome to your timesheet assistant. Where are you working today?");
      this.ask(this.$speech);
    } else {
      this.$speech.addAudio("https://firebasestorage.googleapis.com/v0/b/voice-first-tech.appspot.com/o/Projects%2FSweets-Timesheet-Voice-Assistant%2Fholding_welcome.clockout.mp3?alt=media", "Welcome to your timesheet assistant. Congrats on finishing your day. What did you work on today?");
      this.ask(this.$speech);
    }
  },

  async CatchAllIntent() {
    if (this.$session.$data.isClockIn) {
      return this.toStatelessIntent("ClockInIntent");//Add new row
    } else {
      return this.toStatelessIntent("ClockOutIntent");//Add Depature to last existing row.
    }
  },

  async ClockInIntent() {
    // const userInput = this.$inputs.anything.value;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; //Returns the month (from 1-12)
    const date = now.getDate();
    const dayIndex = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes() / 60; //Returns the minute (from 0-1)
    const daysOfWeek = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
    const dayOfWeek = daysOfWeek[dayIndex];
    const clockInRow = await doc.sheetsByIndex[0].addRow({ Day: dayOfWeek, Date: getDate(), Arrival: hour + minute });
    this.$speech.addAudio("https://firebasestorage.googleapis.com/v0/b/voice-first-tech.appspot.com/o/Projects%2FSweets-Timesheet-Voice-Assistant%2Fholding_clockin.confirm.mp3?alt=media", 'You are now clocked in! Have fun working today!');
    this.tell(this.$speech);
  },

  async ClockOutIntent() {
    // const userInput = this.$inputs.anything.value;
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes() / 60; //Returns the minute (from 0-1)
    //APPEND EXISTING ROW

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const rowCount = rows.length;
    // make updates
    rows[rowCount - 1].Departure = hour + minute;
    // rows[rowCount - 1]["What I did"] = userInput;
    await rows[rowCount - 1].save(); // save changes
    // add my own audio
    this.$speech.addAudio("https://firebasestorage.googleapis.com/v0/b/voice-first-tech.appspot.com/o/Projects%2FSweets-Timesheet-Voice-Assistant%2Fholding_clockout.confirm.mp3?alt=media", 'You are now clocked out! Enjoy the rest of your day!');
    this.tell(this.$speech);
  }
});

function getDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; //Returns the month (from 1-12)
  const date = now.getDate();
  return month + "/" + date + "/" + year;
}
module.exports = { app };
