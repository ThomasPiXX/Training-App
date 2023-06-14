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
    db.get(logInQuery, [username, password], (error, row) =>{
        if(error) {
            return done(error);
        }
        if ( !row ) {
            return done(null, false, {message : 'Incorect usernam or password'});
        }

        const user = new User(row.user_name,row.user_age, row.user_password, row.user_exp, row.user_lvl);
        
        // Compare the provided password with the hashed password stored in the user object

        bcrypt.compare(password, user.password, (error, isMatch) => {
            if(error){
                return done(error);
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
    //find the user by their name 
    db.get(logInQuery, [name], (error, row) => {
        if(error){
            return (error);
        }
        if(!row){
            return done(new Error('no data found'));
        }

        const user = new User(row.user_name, row.user_age, row.user_exp, row.user_lvl, row.user_password);
        return done(null, user);
    
    });
});

//initialize Passport and session middleware
app.use(passport.initialize());
app.use(passport.session());


/////////////////////////////////////

//sqlite connection 
const sqlite3 = require('sqlite3');
const { emitWarning } = require('process');
const bcryptjs = require('bcryptjs');
const { error } = require('console');
const db = new sqlite3.Database('user.db');
const insertQuery = 'INSERT INTO users (user_name, user_age, user_password) VALUES (?, ?, ?)';
const updateLvl = 'UPDATE users SET user_exp = ?, user_lvl = ? WHERE user_name = ?';
const logInQuery = 'SELECT * FROM users WHERE user_name = ? AND user_password = ?';

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
function logIn(req, res) {
    const { username, password } = req.body //get username and password from the form for middleware
    
    //check the Datebase for a row
    db.run('SELECT * FROM use WERE user_name = ?', [username], function(error, row) {
        if(error) {
            throw error;
        }
        if (!row) {
            console.log('ther is now User with that name ')
            return res.render('create-account');
        }
        else{
            User.name = row.user_name;
            User.password = row.user_password;
            User.lvl = row.user_lvl;
            LocalStrategy(User.name, User.password);


        }
    })
}

/////////////////////////////////////////////////////
//Acount creating form path

//path
app.post('/create-account', (req, res)=>{
    const {username, password} = req.body;
    
    //check if user already exist 
    db.run("SELECT * FROM user WHERE user_name=?",[username], function(error, row) {
    if(error) throw error;
    
    if(row) {
        console.log('User already exist');
        res.statuts(400).send('User already exist');
    }else{
        //call passwordHasher
        passwordHasher(password, (hashedPassword) => {
            //Store the hashed password in the database
            db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function(error){
                if (error) throw error;

                console.log("User account added");
                res.send("Acccount created succesfully");
            });
        });
    }
    });
});
//////////////////////////////////////////
//log in path

app.post('/login', logIn)
