/////////////////////////////////////
// express connection 
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const session = require('express-session');
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));

///////////////////////////////////////////
//sqlite connection 
const sqlite3 = require('sqlite3');;
const db = new sqlite3.Database('users.db');
const insertQuery = 'INSERT INTO users (user_name, user_age, user_password) VALUES (?, ?, ?)';
const updateLvl = 'UPDATE users SET user_exp = ?, user_lvl = ? WHERE user_name = ?';
const logInQuery ='SELECT user_name, user_password FROM users WHERE user_name = ? AND user_password = ?'

/////////////////////////
//session config
app.use(session({
    secret:'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
// Set view engine
app.set('view engine', 'ejs');
const path = require('path');
app.set('views', path.join(__dirname, 'view'));



//passport connection;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

//passport 

// Serialize the user object
passport.serializeUser((user, done) => {
    done(null, user.name); // Assuming the user has a unique identifier, you can change it to the appropriate field
  });
  
  // Deserialize the user object
  passport.deserializeUser((username, done) => {
    db.get('SELECT * FROM users WHERE user_name = ?', [username], (error, row) => {
      if (error) {
        return done(error);
      }
      if (!row) {
        return done(null, false);
      }
      const user = new User(row.user_name, row.user_age, row.user_password, row.user_exp, row.user_lvl);
      return done(null, user);
    });
  });


passport.use(new LocalStrategy((username, password, done) => {
    db.get(logInQuery, [username, password], (error, row) =>{
        if(error) {
            return done(error);
        }
        if ( !row ) {
            return done(null, false, {template: 'createAccount' });
        }

        const user = new User(row.user_name,row.user_age, row.user_password, row.user_exp, row.user_lvl);
        
        // Compare the provided password with the hashed password stored in the user object

        bcrypt.compare(password, user.password, (error, isMatch) => {
            if(error){
                return done(error);
            }
            if (!isMatch) {
               return done(null, false, { template: 'createAccount'});

            }
             // Authentication successful
             return done(null, user, {template: 'dashboard'});
            });
        });
    })
);

//initialize Passport and session middleware
app.use(passport.initialize());
app.use(passport.session());




//////////////////////////////////////////////////////////////////
//user model
class User {
    constructor(name, age, password, exp = 0, lvl = 0){
        this.name = name;
        this.age = age;
        this.password = password;
        this.exp = exp;
        this.lvl = lvl;
    }
}
////////////////////////////////////////////////////
// lvl up function 
function lvlUp(user){
    while(user.exp >= 10){
    const remExp = user.exp - 10;
    user.exp = remExp;
    user.lvl++;
    };
}
/////////////////////////////////////////////////////
// user body-parser middleware with extended option
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
/////////////////////////////////////////////////////
//training function 
const exerciceExp = 1;

function trainingTime(exerciceExp,exerciceTime, user){
    let total = exerciceExp * exerciceTime;
    user.exp = total;
    return lvlUp(user.exp) ;
}
//////////////////////////////////////////////////////
//hashing password function 

function passwordHasher(password, callback){
    //Generate a salt to use for hashing
    bcrypt.genSalt(10, (err, salt) =>{
        if (err) return callback(err);

        //hash the password using the generated salt 
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) return callback(err);

            // invoke the callback
            callback(null, hash);
        })
    })
}
/////////////////////////////////////////////////////
//Acount creating form path

//path
app.get('/createAccount', (req, res) =>{
    res.render('createAccount');
})
app.post('/createAccount', (req, res) => {
    const { username, password } = req.body;
  
    // check if user already exists
    db.run("SELECT * FROM users WHERE user_name=?", [username], function(error, row) {
      if (error) throw error;
  
      if (row) {
        console.log('User already exists');
        res.status(400).send('User already exists');
      } else {
        // call passwordHasher
        passwordHasher(password, (hashedPassword) => {

            securepass= hashedPassword
          // Store the hashed password in the database
          db.run("INSERT INTO users (user_name, user_password) VALUES (?, ?)", [username, securepass], function(error) {
            if (error) throw error;
            console.log("User account added");
            res.redirect('/dashboard');
          });1
        });
      }
    });
  });
//////////////////////////////////////////
//log in path

app.get('/', (req, res) =>{
    res.render('login');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard', // Redirect to the dashboard template on successful authentication
    failureRedirect: '/createAccount' // Redirect to the createAccount template on failed authentication
}));
/////////////////////////////////////////////
//Upadting user lvl


app.post('/userLevel', (req, res) =>{
    //getting UserID
    const userId = req.user;
    const userExperience = userId.exp;
    const userLvl = userId.lvl;
    //getting the exerciceTime value 
    const {Time} = req.body;
    exerciceTime = Time;
    
    
    //calling the lvl updater 
    trainingTime(exerciceTime, exerciceExp);

    console.log('lvl up as been executed properly');
    //adding user lvl and experience to Database
    db.run(updateLvl, [userId, userExperience, userLvl], (err) => {
        if(err) {
            console.error('Error updating user level in the database:', err);
            res.status(500).send('Error updating user level in the database');
        } else {
            console.log('SQL query executed successfully');
            res.redirect('dashboard');
        }
    });
});

//////////////////
//dashboard route 

app.get('/dashboard', (req, res) => {
    res.render('dashboard',{ user: req.user});
});

///////////////////

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
});

