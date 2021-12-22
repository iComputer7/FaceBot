import * as mssql from "mssql";

export interface iC7Param {
	name: string,
	value: any,
	type: mssql.ISqlType
}

export interface iC7ParamNoType {
	[key: string]: any
}

export class iC7MSSQLDriver {
	private conn: mssql.ConnectionPool;
	public settings: mssql.config;

	constructor(settings: mssql.config, silent: boolean = false) {
		this.settings = settings;
		this.conn = new mssql.ConnectionPool(this.settings);
		if (!silent) console.log("Database driver initialized.");

		this.conn.on("error", (err: string) => {
			console.error(err);
		});
	}

	//Inserts data into DB.
	insert(table: string, params: Array<iC7Param> | iC7ParamNoType): Promise<void | mssql.IResult<any>> {
		return new Promise((res, rej) => {
			this.conn.connect().catch((e) => rej(e)).then(() => {
				let req = new mssql.Request(this.conn);
				
				//adding parameters into the query
				let columns: Array<string> = new Array();

				//need to do different things based on what was passed
				if (Array.isArray(params)) {
					//If params is an array, special types were given
					for (let p of params) {
						columns.push(p.name);
						req.input(p.name, p.type, p.value);
					}
				} else {
					//If params is an object, no types were given
					for (let [_n, _v] of Object.entries(params)) {
						columns.push(_n);
						req.input(_n, _v);
					}
				}

				req.query(`INSERT INTO ${table} (${columns.join(",")}) VALUES (@${columns.join(",@")})`)
				.catch((err) => rej(err))
				.then((result) => res(result));
			});
		});
	}

	//Closes the connection.
	close(): Promise<void> {
		return new Promise((res, rej) => {
			this.conn.close().catch(rej).then(res);
		});
	}
}
