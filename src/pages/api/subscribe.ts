import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import { fauna } from '../../services/fauna';
import { stripe } from '../../services/stripe';
import { query as q } from 'faunadb';

type User = {
    ref: {
        id: string;
    }
    data: {
        stripe_customer_id: string;
    }
}

export default async (req:NextApiRequest, res:NextApiResponse) => {
    if(req.method === 'POST') {
        const session = await getSession({req});

        const user = await fauna.query<User>(
            q.Get(
                q.Match(
                    q.Index('user_by_email'),
                    q.Casefold(session.user.email)
                )
            )
        );

        let customerId = user.data.stripe_customer_id;
        
        if(!customerId){

            const stripeCustomer = await stripe.customers.create({
                email: session.user.email,
            });

            await fauna.query(
                q.Update(
                    q.Ref(q.Collection('users'), user.ref.id),
                    {
                        data: {
                            stripe_customer_id: stripeCustomer.id,
                        }
                    }

                )
            );

            customerId = stripeCustomer.id;
        }

        const striperCheckoutSession = await stripe.checkout.sessions.create({
            customer: customerId, // cliente que compra o produto. Devemos passar o id do cliente dentro do stripe. 
            payment_method_types: ['card'], // meios de pagamento, vamos aceitar apenas card
            billing_address_collection: 'required', // obrigar o usuário a preencher o endereço
            line_items: [ // itens que eu quero no vetor
                {   
                    price: 'price_1ItF8gDBsO7cZmwjzTnKg8T1', // id do preço cadastrado no stripe
                    quantity: 1 // quantidade 
                }
            ],
            mode: 'subscription', // pagamento recorrente
            allow_promotion_codes: true, // permitir desconto
            success_url: process.env.STRIPE_SUCCESS_URL, // redirecionamento caso sucesso
            cancel_url: process.env.STRIPE_CANCEL_URL, // redirecioanemtno caso cancelar a requisição
        });

        return res.status(200).json({sessionId: striperCheckoutSession.id});
    }
    else{
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method not allowed');
    }
} 