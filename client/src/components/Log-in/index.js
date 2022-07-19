import React, { useState } from 'react';
import { useMutation } from '@apollo/client'
import { LOGIN_USER } from '../../utils/mutations'
import Auth from '../../utils/auth'



export default function Log(props) {
    const [formState, setFormState] = useState({ email: '', password: ''})

    const [login, { error }] = useMutation(LOGIN_USER)

    const handleChange = (event) => {
        const { name, value } = event.target

        setFormState({
            ...formState,
            [name]: value
        })
    }

    const handleFormSubmit = async (event) => {
        event.preventDefault()

        try {
            const { data } = await login({
                variables: {...formState}
            })
            Auth.login(data.login.token)
        } catch(e) {
            console.error(e)
        }

     
    }

    return( 
        
        <div className="bg-grey-lighter min-h-screen flex flex-col">
            <div className="container max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
                <div className="bg-white px-6 py-8 rounded shadow-md text-black w-full">
                    <h1 className="mb-8 text-3xl text-center bg-white">Log In</h1>
                        <form onSubmit={handleFormSubmit} className="bg-white text-center">
                            <input
                            type="text"
                            className="block border border-grey-light p-3 rounded mb-4 w-5/6 m-auto"
                            name="email"
                            placeholder="Email"
                            value={formState.email}
                            onChange={handleChange}
                            />
                            <input
                            type="password"
                            className="block border border-grey-light p-3 rounded mb-4 w-5/6 m-auto"
                            name="password"
                            placeholder="Password"
                            value={formState.password}
                            onChange={handleChange}
                            />
                            {/* <input
                            type="password"
                            className="block border border-grey-light w-full p-3 rounded mb-4"
                            name="confirm_password"
                            placeholder="Confirm Password"
                            /> */}
                            <button
                            type="submit"
                            className="w-5/6 text-center py-3 rounded bg-purple-400 text-black hover:bg-green-dark focus:outline-none my-1"
                            >
                            Log In
                            </button>
                        </form>
                </div>
                {error && <div className='text-red-400'>Log In failed</div>}
            </div>
      </div>
      
    )
}