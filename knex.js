import Knex from 'knex';
import knexConfig from './knexConfig.js';

const knex = Knex(knexConfig);

export default knex;