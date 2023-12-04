const User = require('../models/userModel.js');





exports.createUser = (req, res, next) => {

    const user = new User({
      surname: req.body.surname,
    });
    user.save().then(
      (savedUser) => {
        res.json({ success: true, id: savedUser._id });
        
      }
    ).catch(
      (error) => {
        res.status(400).json({
          error: error
        });
      }
    );
  };

  //Initialisation de la connexion socket
  //socket.join(code)
  //io.to(code).emit("sendListPlayer", listPlayer);
  exports.getSurname = (req, res, next) => {
  User.findOne({
    _id: req.params.id
  }).then(
    (user) => {
      res.json({ success: true, surname: user.surname });
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.updateUserSurname = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.surname = req.body.surname;
    await user.save();

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating user surname:', error);
    return res.status(500).json({ error: error.message });
  }
};
  
    
