/////////////////////////////////////
// express connection 
const express = require('express');
const app = express();
const session = require('express-session');
const port = 3000;
app.use(express.urlencoded({extend: true}));
app.use(express.static('public'));
app.listen(port, () => {
    console.log('server running on http: //localhost:${port}');
});

/////////////////////////
//session config
app.use(session({
    secret:'your-secret-key',
    resave: false,
    saveUninitialized: false
}));



//passport connection;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy((username, password, done) => {
    const logInQuery = 'SELECT * FROM users WHERE user_name = ? AND user_password = ?';
    db.get(logInQuery, [username, password], (error, row) =>{
        if(error) {
            return done(error);
        }
        if ( !row ) {
            return done(null, false, {message : 'Incorect usernam or password'});
        }

        const user = new User(row.user_name,row.user_age, row.user_password, row.user_exp, row.user_lvl);
        
        // Compare the provided password with the hashed password stored in the user object

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if(err){
                return done(err);
            }
            if (!isMatch) {
                return done(null, false, {messsage : 'Incorrect username or password'});

            }
             // Authentication successful
            return done(null, user);
            });
        });
    })
);

// Serialize the user for session storage
passport.serializeUser((user, done) => {
    done(null, user.name); //store the user name in the session
});
// Deserialize the user from session storage
passport.deserializeUser((name, done) => {


/////////////////////////////////////

//sqlite connection 
const sqlite3 = require('sqlite3');
const { emitWarning } = require('process');
const bcryptjs = require('bcryptjs');
const { error } = require('console');
const db = new sqlite3.Database('user.db');
const insertQuery = 'INSERT INTO users (user_name, user_age, user_password) VALUES (?, ?, ?)';
const updateLvl = 'UPDATE users SET user_exp = ?, user_lvl = ? WHERE user_name = ?';
const logIn = 'SELECT * FROM users WHERE user_name = ? AND user_age = ?';
//////////////////////////////////////////////////////////////////
//user model
class User {
    constructor(username, age, password, exp = 0, lvl = 0){
        this.name = username;
        this.age = age;
        this.password = password;
        this.exp = exp;
        this.lvl = lvl;
    }
}
////////////////////////////////////////////////////
// lvl up function 
function lvlUp(){
    while(user.exp >= 10){
    const remExp = user.exp - 10;
    user.exp = remExp;
    user.lvl++;
    };
}
/////////////////////////////////////////////////////
//training function 
const exerciceExp = 1;
let exerciceTime = NaN;

function trainingTime(exerciceExp,exerciceTime){
    let total = exerciceExp * exerciceTime;
    user.exp = total;
    return lvlUp(user.exp) ;
}
//////////////////////////////////////////////////////
//hashing password function 

function passwordHasher(password, callback){
    //Generate a salt to use for hashing
    bcrypt.genSalt(10, (err, salt) =>{
        if (err) throw err;

        //hash the password using the generated salt 
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) throw err;

            // invoke the callback
            callback(hash)
        })
    })
}
//////////////////////////////////////////////////////
 //logIn function 
function logIn(req, res){
    //check if user has an account on session or cookies

    //if the user is logged in, retrieve their information and render the dashboard
    if(req.isAuthenticated()) {
        const username = req.body.username;
        const age = req.body.age ;
        const password = req.body.password;
        const logInQuery = 'SELECT * FROM users WHERE user_name = ? AND user_age = ? AND user_password = ?';
        db.get(logInQuery, [username, age, password], (error, row) => {
            if (error){throw error};
            if (row) {
                User.username = row.user_name;
                User.age = row.user_age;
                User.exp = row.user_exp;
                User.password = row.user_password;
                User.lvl = row.user_lvl;
                console.log("User information have been retrieved:");
                console.log("Username: " + user.name);
                
                //Render the dashboard template and pass the user object
                res.render('dashboard', {user});    
            }else{
                console.log("No user found. Please create an account.");
                res.render('create-acocount');
            }
        }); 
    }else{
        //if user is not logged in, render the login page
        res.render('login');
    }
}

/////////////////////////////////////////////////////
//Acount creating form path

//path
app.post('/create-account', (req, res)=>{
    const { username, age, password } = req.body;

    //call passwordHasher
    passwordHasher(password, (hashedPassword) => {
        // Store the hashed password in the database
        db.run(insertQuery, [username, age, hashedPassword], function (error) {
            if (error) throw error;
      
            console.log("User account added");
            res.send("Account created successfully");
        });
    });
});

//////////////////////////////////////////
//log in path

app.post('/login', logIn);
