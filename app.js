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
const passport = require('./passport');//import the passport.js file

app.use(passport.initialize());
app.use(passport.session());

/////////////////////////////////////

//sqlite connection 
const sqlite3 = require('sqlite3');
const { emitWarning } = require('process');
const bcryptjs = require('bcryptjs');
const db = new sqlite3.Database('user.db');
const insertQuery = 'INSERT INTO users (user_name, user_age, user_password) VALUES (?, ?, ?)';
const updateLvl = 'UPDATE users SET user_exp = ?, user_lvl = ? WHERE user_name = ?';
const logIn = 'SELECT * FROM users WHERE user_name = ? AND user_age = ?';
//////////////////////////////////////////////////////////////////
//user referennce
const user = {
    name:"",
    age:"",
    password:NaN,
    exp:0,
    lvl:0
};
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
///////////////////////////////////////////////////
//log in function 
function oldeLogin /*reference pas bon */(){
    console.log("please create an Account :)");  
            rl.question('Enter your name: ', (name) => {
                user.name = name;
                rl.question("Enter age:? ", (age) => {
                    user.age = age;
                    db.run(insertQuery, [user.name, user.age, user.password], function (error){
                        if (error) throw error;
                        console.log("User have been add to the database");
                        welcome()
                    })
                    })
                })};
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
 //welcome function 
function welcome(req, res){
    //check if user has an account on session or cookies

    //if the user is logged in, retrieve their information and render the dashboard
    if(req.isAuthenticated()) {
        const username = req.body.username;
        const age = req.body.age ;
        const password = req.body.password;
        const logInQuery = 'SELECT * FROM users WHERE user_name = ? AND user_age = ? ';
        db.get(logInQuery, [username, age, password], (error, row) => {
            if (error){throw error};
            if (row) {
                user.name = row.user_name;
                user.age = row.user_age;
                user.exp = row.user_exp;
                user.password = row.user_password;
                user.lvl = row.user_lvl;
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
//Acount creating fomr path
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
