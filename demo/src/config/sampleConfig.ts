import { RestConfigMap } from 'common-rest-mongo';
export const sampleConfig: RestConfigMap = {
  'asset': {
    db: {
      id: { type: String, required: true, unique: true},
      name: { type: String, required: true},
      address: String
    },
    rest: {
      'id': { autoIncrement: true, primaryKey: true, writable: false},
      'name': { required: true },
      '_id': { readable: false },
      '__v': { readable: false, writable: false },
      'address': {readable: false },
    }
  }
}

