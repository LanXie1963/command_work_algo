import {users, tokens} from '../db/controller.js'
import {isBetween, authenticate} from './utils.js'


const isValidUser = (name, password) => {
  return (typeof name === 'string' && typeof password === 'string' &&
          isBetween(name.length, 3, 20) && isBetween(password.length, 10, 32));
};


export const isAuthenticated = async (req, res) => {
  const user_id = await authenticate(req, res);

  res.status(200).send({ response: user_id ? true : false });
};

export const createUser = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  if (!isValidUser(username, password)) {
    return res.status(400).json({ error: 'Bad username or password. Username must be between 3 and 20 characters and password must be between 10 and 32 characters' });
  }

  const user_id = await authenticate(req, res);

  if (user_id != null) {
    return res.status(401).json({ error: 'Already logged in' });
  }


  try {
    if (await users.exists(username)) {
      return res.status(409).json({ error: 'User already exists' });
    }
  

    const id = await users.createUser(username, password);

    const token = await tokens.createToken(id);
    res.cookie('auth_token', token, { maxAge: 86400000 * 15 }).cookie('user_id', id, { maxAge: 86400000 * 15 }).status(201).send({ response: id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUser = async (req, res) => {
  const user_id = await authenticate(req, res);
  if (!user_id) {
    return res.status(401).json({ error: 'Not logged in or invalid token' });
  }
  try {
    const user = await users.getUser(user_id);
    delete user.hash; // no security threats for you today!
    res.json({ response: user }).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const loginUser = async (req, res) => {
  const { username, password } = req.body;
  if (!isValidUser(username, password)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const user_id = await authenticate(req, res);
  
  if (user_id != null) {
    return res.status(401).json({ error: 'Already logged in' });
  }

  try {
    const id = await users.getIdByName(username);
    
    if (!id || !await users.matchesPassword(id, password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await tokens.createToken(id);

    res.cookie('auth_token', token, { maxAge: 86400000 * 15 }).cookie('user_id', id, { maxAge: 86400000 * 15 }).status(201).send({ response: id });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const logoutUser = async (req, res) => {

  const user_id = await authenticate(req, res);
  if (!user_id) {
    return res.status(401).json({ error: 'Not logged in or invalid token' });
  }

  try {
    await tokens.deleteToken(req.cookies.auth_token);
    res.clearCookie('auth_token').clearCookie('user_id').json({ response: 'Logged out' }).status(200);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const changePassword = async (req,res) => {
  
  const user_id = await authenticate(req, res);
  if (!user_id) {
    return res.status(401).json({ error: 'Not logged in or invalid token' });
  }

  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    if (!await users.matchesPassword(user_id, old_password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await users.changePassword(user_id, new_password);
    res.json({ response: 'Password changed' }).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }

}

export const deleteUser = async (req,res) => {

  const user_id = await authenticate(req, res);
  if (!user_id) {
    return res.status(401).json({ error: 'Not logged in or invalid token' });
  }

  try {
    await users.delUser(user_id);
    res.json({ response: 'User deleted' }).status(200);

  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }

}



export const getMyself = async (req, res) => {
  const user_id = await authenticate(req, res);
  if (!user_id) {
      return res.status(401).json({ error: 'Not logged in or invalid token' });
  }
  const user = await users.getUser(user_id);
  delete user.hash; // No security risks for you today
  res.json({ response: user }).status(200);

}
