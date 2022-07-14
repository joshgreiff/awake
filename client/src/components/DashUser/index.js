import React from "react";

const DashUser = ({me}) => {

    return (
        <div className="user-dash-div">
            <div>
                <h3 className="text-black font-bold text-2xl py: 10 lg:underline lg:underline-offset-8 decoration-blue-900 decoration-2 lg:py-10 font">Hello, {me.username}</h3>
            </div>
            <div>
                <p className="text-black text-xl py-2 lg:py-6 font">You're currently level {me.level}</p>
            </div>
            <div>
                <p className="text-black text-xl py-2 lg:py-6 font">You have {me.coins} coins</p>
            </div>
            <div>
                <p className="text-black text-xl py-2 lg:py-6 font">You currently have {me.exp} experience points</p>
            </div>
        </div>
    )
}

export default DashUser