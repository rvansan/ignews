import { NextApiRequest, NextApiResponse } from 'next';

export default (request: NextApiRequest, response: NextApiResponse) => {
	const users = [
        {id: 1, name: 'Rafael'},
        {id: 2, name: 'Pamela'}
    ];  
    return response.json(users);    
}