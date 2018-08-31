const validateEmail = require('../utils/validate-email')
const { Property, Owner } = require('../data/models')
const cloudinary = require('cloudinary')
const mongoose = require('mongoose')

cloudinary.config({
    cloud_name: 'locationssky',
    api_key: '669844342926842',
    api_secret: 'RvGkuR632nomFrd-_NNYe2CXt60'
})

const logic = {

    /** String field validator
     * 
     * @param {string} name The name of the value
     * @param {string} value The value of the value
     * 
     * @throws {LogicError} If string input is invalid
     * 
     */
    _validateStringField(name, value) {
        if (typeof value !== 'string' || !value.length) throw new LogicError(`invalid ${name}`)
    },

    _validateObjectId(id) {
        if(!mongoose.Types.ObjectId.isValid(id)) throw new LogicError(`invalid ObjectId ${id}`)
    },


    /** Email validator
     * 
     * @param {string} email The owner's email
     * 
     * @throws {LogicError} If mail is invalid
     * 
     */
    _validateEmail(email) {
        if (!validateEmail(email)) throw new LogicError('invalid email')
    },


    /** Number field validator
     * 
     * @param {string} name The name of the value
     * @param {string} value The value of the value
     * 
     * @throws {LogicError} If number input is invalid
     * 
     */
    _validateNumberField(name, value) {
        if (typeof value !== 'number') throw new LogicError(`invalid ${name}`)
    },

    _saveImage(base64Image) {
        return Promise.resolve()
            .then(() => {
                if (typeof base64Image !== 'string') new LogicError('base64Image is not a string')

                return new Promise((resolve, reject) => {
                    return cloudinary.v2.uploader.upload(base64Image, function (err, data) {
                        if (err) return reject(err)

                        resolve(data.url)
                    })
                })

            })
    },


    /** Register owner with email, password and name
     * 
     * @param {string} email The owner's email
     * @param {string} password The owner's password
     * @param {string} name The owner's name
     * 
     * @throws {LogicError} If owner email is already exist
     * 
     */
    register(email, password, name) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('password', password)
                this._validateStringField('name', name)

                return Owner.findOne({ email })
            })
            .then(owner => {
                if (owner) throw new LogicError(`owner with ${email} email already exist`)

                return Owner.create({ email, password, name })
            })
            .then(() => true)
    },


    /** Authenticate owner with email and password
     * 
     * @param {string} email The owner's email
     * @param {string} password The owner's password
     * 
     * @throws {LogicError} If owner email does not exist
     * @throws {LogicError} If wrong password
     * 
     */
    authenticate(email, password) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('password', password)

                return Owner.findOne({ email })
            })
            .then(owner => {
                if (!owner) throw new LogicError(`owner with ${email} email does not exist`)

                if (owner.password !== password) throw new LogicError(`wrong password`)

                return true
            })
    },


    /** Update owner password
     * 
     * @param {string} email The owner's email
     * @param {string} password The owner's password
     * @param {string} newPassword The owner's new password
     * 
     * @throws {LogicError} If owner email does not exist
     * @throws {LogicError} If wrong password
     * @throws {LogicError} If password is equal as the new password
     * 
     */
    updatePassword(email, password, newPassword) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('password', password)
                this._validateStringField('new password', newPassword)

                return Owner.findOne({ email })
            })
            .then(owner => {
                if (!owner) throw new LogicError(`owner with ${email} email does not exist`)

                if (owner.password !== password) throw new LogicError(`wrong password`)

                if (password === newPassword) throw new LogicError('new password must be different to old password')

                owner.password = newPassword

                return owner.save()
            })
            .then(() => true)
    },


    /** Update owner password
     * 
     * @param {string} email The owner's email
     * @param {string} password The owner's password
     * 
     * @throws {LogicError} If owner email does not exist
     * @throws {LogicError} If wrong password
     * 
     */
    unregisterOwner(email, password) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('password', password)

                return Owner.findOne({ email })
            })
            .then(owner => {
                if (!owner) throw new LogicError(`owner with ${email} email does not exist`)

                if (owner.password !== password) throw new LogicError(`wrong password`)

                return Owner.deleteOne({ _id: owner._id })
            })
            .then(() => true)
    },


    /** Add new property
     * 
     * @param {string} email The owner's email
     * @param {string} title The title of the property
     * @param {string} photo The url of the photo
     * @param {string} description The description of the property
     * @param {number} dimentions THe dimentions of the property
     * @param {string} categories The categories of the property
     * @param {string} type The type of the property
     * 
     * @throws {LogicError} If owner email does not exist
     * @throws {LogicError} If wrong password
     * 
     */
    addProperty(email, title, photo, description, dimentions, categories, type) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('title', title)
                this._validateStringField('photo', photo)
                this._validateStringField('description', description)
                this._validateNumberField('dimentions', dimentions)
                this._validateStringField('type', type)
                if (!(categories instanceof Array)) throw new LogicError('invalid categories')

                return Owner.findOne({ email })
            })
            .then(owner => {
                if (!owner) throw new LogicError(`owner with ${email} email does not exist`)
                if (!categories || !categories.length) throw new LogicError('at least one category')

                return this._saveImage(photo)
                    .then(imageCloudinary => {
                        const property = { title, photo: imageCloudinary, description, dimentions, categories, type, owner: owner.id }

                        return Property.create(property)
                    })
            })
            .then(() => true)
    },

    /** List all properties
     * 
     * 
     */
    listProperty() {
        return Promise.resolve()
            .then(() => {
                return Property.find().lean()
            })
            .then(properties => {
                if (properties) {
                    properties.forEach(property => {
                        property.id = property._id.toString()

                        delete property._id

                        delete property.__v
                    })
                }

                return properties || []
            })
    },

    listPropertyByQuery(type, categories) {
        return Promise.resolve()
            .then(() => {
                let criteria = {}

                if(type) {
                    this._validateStringField("type", type)    
                    criteria.type = type
                } 
                    
                if(categories) {
                    if (!(categories instanceof Array)) throw new LogicError('invalid categories')
                    criteria.categories = { $in: categories }
                }

                if(!Object.keys(criteria).length) throw new LogicError('Invalid search')

                return Property.find(criteria).lean()
                    .then(properties => {
                        if(properties) {
                            properties.forEach(property => {
                                property.id = property._id.toString()

                                delete property._id
                                delete property.__v
                            })
                        }
                        return properties
                    })
            })
    },

    /** Retrieve properties by ID
     * 
     * @param {string} email The owner's email
     * @param {string} propertyId The ID of the property
     * 
     * @throws {LogicError} If owner email does not exist
     * @throws {LogicError} If id property does not exist
     * 
     */
    // retrievePropertyById(email, propertyId) {
    //     return Promise.resolve()
    //         .then(() => {
    //             this._validateEmail(email)

    //             return Owner.findOne({ email })
    //         })
    //         .then(owner => {
    //             if (!owner) throw new LogicError(`Owner with ${email} email does not exist`)

    //             return Property.findOne({ _id: propertyId }).lean()
    //                 .then(property => {
    //                     if (!property) throw new LogicError(`Property with id ${propertyId} does not exist`)
    //                     property.id = property._id.toString()

    //                     delete property._id

    //                     delete property.__v

    //                     return property
    //                 })
    //         })
    // },

    retrievePropertyById(email, propertyId) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateObjectId(propertyId)

                return Owner.findOne({ email })
            })
            .then(owner => {
                if (!owner) throw new LogicError(`Owner with ${email} email does not exist`)

                return Property.findById( propertyId )
                    .then(property => {
                        debugger
                        if (!property) throw new LogicError(`Property with id ${propertyId} does not exist`)
                        property.id = property._id.toString()

                        delete property._id

                        delete property.__v

                        return property
                    })
            })
    },


    /** Update property
     * 
     * @param {string} email The owner's email
     * @param {string} id The ID of the property
     * @param {string} photo The photo of the property
     * @param {string} description The description of the property
     * @param {number} dimentions The dimentions of the property
     * @param {string} categories The categories of the property
     * @param {string} type The type of the property
     * 
     * @throws {LogicError} If owner email does not exist
     * @throws {LogicError} If id property does not exist
     * 
     */
    updatePropertyById(email, id, title, photo, description, dimentions, categories, type) {
        return Promise.resolve()
            .then(() => {
                this._validateStringField("title", title)
                this._validateStringField("photo", photo)
                this._validateStringField("description", description)
                this._validateNumberField('dimentions', dimentions)
                this._validateStringField("type", type)
                
                return Owner.findOne({ email })
                    .then(owner => {
                        if (!owner) throw new LogicError(`Owner with ${email} email does not exist`)
                        return Property.findOne({ _id: id, owner: owner.id })
                            .then((property) => {
                                if (!property) throw new LogicError(`cannot update property ${id}`)

                                return Property.updateOne({ _id: id }, { $set: { "title": title, "photo": photo, "description": description, "dimentions": dimentions, "categories": categories, "type": type } })
                                    .then(() => true)
                            })
                    })
            })
    }

}

class LogicError extends Error {
    constructor(message) {
        super(message)
    }
}

module.exports = { logic, LogicError }