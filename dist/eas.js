"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EAS = void 0;
const tslib_1 = require("tslib");
const eas_contracts_1 = require("@ethereum-attestation-service/eas-contracts");
const version_1 = require("./legacy/version");
const offchain_1 = require("./offchain");
const request_1 = require("./request");
const transaction_1 = require("./transaction");
const utils_1 = require("./utils");
tslib_1.__exportStar(require("./request"), exports);
class EAS extends transaction_1.Base {
    proxy;
    delegated;
    offchain;
    constructor(address, options) {
        const { signerOrProvider, proxy } = options || {};
        super(new eas_contracts_1.EAS__factory(), address, signerOrProvider);
        if (proxy) {
            this.proxy = proxy;
        }
    }
    // Connects the API to a specific signer
    connect(signerOrProvider) {
        delete this.delegated;
        delete this.offchain;
        super.connect(signerOrProvider);
        return this;
    }
    // Returns the version of the contract
    async getVersion() {
        return (await (0, version_1.legacyVersion)(this.contract)) ?? this.contract.version();
    }
    // Returns an existing schema by attestation UID
    getAttestation(uid) {
        return this.contract.getAttestation(uid);
    }
    // Returns whether an attestation is valid
    isAttestationValid(uid) {
        return this.contract.isAttestationValid(uid);
    }
    // Returns whether an attestation has been revoked
    async isAttestationRevoked(uid) {
        const attestation = await this.contract.getAttestation(uid);
        if (attestation.uid === utils_1.ZERO_BYTES32) {
            throw new Error('Invalid attestation');
        }
        return attestation.revocationTime != request_1.NO_EXPIRATION;
    }
    // Returns the timestamp that the specified data was timestamped with
    getTimestamp(data) {
        return this.contract.getTimestamp(data);
    }
    // Returns the timestamp that the specified data was timestamped with
    getRevocationOffchain(user, uid) {
        return this.contract.getRevokeOffchain(user, uid);
    }
    // Returns the EIP712 proxy
    getEIP712Proxy() {
        return this.proxy;
    }
    // Returns the delegated attestations helper
    getDelegated() {
        if (this.delegated) {
            return this.delegated;
        }
        return this.setDelegated();
    }
    // Returns the offchain attestations helper
    getOffchain() {
        if (this.offchain) {
            return this.offchain;
        }
        return this.setOffchain();
    }
    // Attests to a specific schema
    async attest({ schema, data: { recipient, data, expirationTime = request_1.NO_EXPIRATION, revocable = true, refUID = utils_1.ZERO_BYTES32, value = 0n } }, overrides) {
        const tx = await this.contract.attest({ schema, data: { recipient, expirationTime, revocable, refUID, data, value } }, { value, ...overrides });
        // eslint-disable-next-line require-await
        return new transaction_1.Transaction(tx, async (receipt) => (0, utils_1.getUIDsFromAttestReceipt)(receipt)[0]);
    }
    // Attests to a specific schema via an EIP712 delegation request
    async attestByDelegation({ schema, data: { recipient, data, expirationTime = request_1.NO_EXPIRATION, revocable = true, refUID = utils_1.ZERO_BYTES32, value = 0n }, signature, attester, deadline = request_1.NO_EXPIRATION }, overrides) {
        const tx = await this.contract.attestByDelegation({
            schema,
            data: {
                recipient,
                expirationTime,
                revocable,
                refUID,
                data,
                value
            },
            signature,
            attester,
            deadline
        }, { value, ...overrides });
        // eslint-disable-next-line require-await
        return new transaction_1.Transaction(tx, async (receipt) => (0, utils_1.getUIDsFromAttestReceipt)(receipt)[0]);
    }
    // Multi-attests to multiple schemas
    async multiAttest(requests, overrides) {
        const multiAttestationRequests = requests.map((r) => ({
            schema: r.schema,
            data: r.data.map((d) => ({
                recipient: d.recipient,
                expirationTime: d.expirationTime ?? request_1.NO_EXPIRATION,
                revocable: d.revocable ?? true,
                refUID: d.refUID ?? utils_1.ZERO_BYTES32,
                data: d.data ?? utils_1.ZERO_BYTES32,
                value: d.value ?? 0n
            }))
        }));
        const requestedValue = multiAttestationRequests.reduce((res, { data }) => {
            const total = data.reduce((res, r) => res + r.value, 0n);
            return res + total;
        }, 0n);
        const tx = await this.contract.multiAttest(multiAttestationRequests, {
            value: requestedValue,
            ...overrides
        });
        // eslint-disable-next-line require-await
        return new transaction_1.Transaction(tx, async (receipt) => (0, utils_1.getUIDsFromAttestReceipt)(receipt));
    }
    // Multi-attests to multiple schemas via an EIP712 delegation requests
    async multiAttestByDelegation(requests, overrides) {
        const multiAttestationRequests = requests.map((r) => ({
            schema: r.schema,
            data: r.data.map((d) => ({
                recipient: d.recipient,
                expirationTime: d.expirationTime ?? request_1.NO_EXPIRATION,
                revocable: d.revocable ?? true,
                refUID: d.refUID ?? utils_1.ZERO_BYTES32,
                data: d.data ?? utils_1.ZERO_BYTES32,
                value: d.value ?? 0n
            })),
            signatures: r.signatures,
            attester: r.attester,
            deadline: r.deadline ?? request_1.NO_EXPIRATION
        }));
        const requestedValue = multiAttestationRequests.reduce((res, { data }) => {
            const total = data.reduce((res, r) => res + r.value, 0n);
            return res + total;
        }, 0n);
        const tx = await this.contract.multiAttestByDelegation(multiAttestationRequests, {
            value: requestedValue,
            ...overrides
        });
        // eslint-disable-next-line require-await
        return new transaction_1.Transaction(tx, async (receipt) => (0, utils_1.getUIDsFromAttestReceipt)(receipt));
    }
    // Revokes an existing attestation
    async revoke({ schema, data: { uid, value = 0n } }, overrides) {
        const tx = await this.contract.revoke({ schema, data: { uid, value } }, { value, ...overrides });
        return new transaction_1.Transaction(tx, async () => { });
    }
    // Revokes an existing attestation an EIP712 delegation request
    async revokeByDelegation({ schema, data: { uid, value = 0n }, signature, revoker, deadline = request_1.NO_EXPIRATION }, overrides) {
        const tx = await this.contract.revokeByDelegation({
            schema,
            data: {
                uid,
                value
            },
            signature,
            revoker,
            deadline
        }, { value, ...overrides });
        return new transaction_1.Transaction(tx, async () => { });
    }
    // Multi-revokes multiple attestations
    async multiRevoke(requests, overrides) {
        const multiRevocationRequests = requests.map((r) => ({
            schema: r.schema,
            data: r.data.map((d) => ({
                uid: d.uid,
                value: d.value ?? 0n
            }))
        }));
        const requestedValue = multiRevocationRequests.reduce((res, { data }) => {
            const total = data.reduce((res, r) => res + r.value, 0n);
            return res + total;
        }, 0n);
        const tx = await this.contract.multiRevoke(multiRevocationRequests, {
            value: requestedValue,
            ...overrides
        });
        return new transaction_1.Transaction(tx, async () => { });
    }
    // Multi-revokes multiple attestations via an EIP712 delegation requests
    async multiRevokeByDelegation(requests, overrides) {
        const multiRevocationRequests = requests.map((r) => ({
            schema: r.schema,
            data: r.data.map((d) => ({
                uid: d.uid,
                value: d.value ?? 0n
            })),
            signatures: r.signatures,
            revoker: r.revoker,
            deadline: r.deadline ?? request_1.NO_EXPIRATION
        }));
        const requestedValue = multiRevocationRequests.reduce((res, { data }) => {
            const total = data.reduce((res, r) => res + r.value, 0n);
            return res + total;
        }, 0n);
        const tx = await this.contract.multiRevokeByDelegation(multiRevocationRequests, {
            value: requestedValue,
            ...overrides
        });
        return new transaction_1.Transaction(tx, async () => { });
    }
    // Attests to a specific schema via an EIP712 delegation request using an external EIP712 proxy
    attestByDelegationProxy(request, overrides) {
        if (!this.proxy) {
            throw new Error("Proxy wasn't set");
        }
        return this.proxy.attestByDelegationProxy(request, overrides);
    }
    // Multi-attests to multiple schemas via an EIP712 delegation requests using an external EIP712 proxy
    multiAttestByDelegationProxy(requests, overrides) {
        if (!this.proxy) {
            throw new Error("Proxy wasn't set");
        }
        return this.proxy.multiAttestByDelegationProxy(requests, overrides);
    }
    // Revokes an existing attestation an EIP712 delegation request using an external EIP712 proxy
    revokeByDelegationProxy(request, overrides) {
        if (!this.proxy) {
            throw new Error("Proxy wasn't set");
        }
        return this.proxy.revokeByDelegationProxy(request, overrides);
    }
    // Multi-revokes multiple attestations via an EIP712 delegation requests using an external EIP712 proxy
    multiRevokeByDelegationProxy(requests, overrides) {
        if (!this.proxy) {
            throw new Error("Proxy wasn't set");
        }
        return this.proxy.multiRevokeByDelegationProxy(requests, overrides);
    }
    // Timestamps the specified bytes32 data
    async timestamp(data, overrides) {
        const tx = await this.contract.timestamp(data, overrides ?? {});
        // eslint-disable-next-line require-await
        return new transaction_1.Transaction(tx, async (receipt) => (0, utils_1.getTimestampFromTimestampReceipt)(receipt)[0]);
    }
    // Timestamps the specified multiple bytes32 data
    async multiTimestamp(data, overrides) {
        const tx = await this.contract.multiTimestamp(data, overrides ?? {});
        // eslint-disable-next-line require-await
        return new transaction_1.Transaction(tx, async (receipt) => (0, utils_1.getTimestampFromTimestampReceipt)(receipt));
    }
    // Revokes the specified offchain attestation UID
    async revokeOffchain(uid, overrides) {
        const tx = await this.contract.revokeOffchain(uid, overrides ?? {});
        return new transaction_1.Transaction(tx, 
        // eslint-disable-next-line require-await
        async (receipt) => (0, utils_1.getTimestampFromOffchainRevocationReceipt)(receipt)[0]);
    }
    // Revokes the specified multiple offchain attestation UIDs
    async multiRevokeOffchain(uids, overrides) {
        const tx = await this.contract.multiRevokeOffchain(uids, overrides ?? {});
        // eslint-disable-next-line require-await
        return new transaction_1.Transaction(tx, async (receipt) => (0, utils_1.getTimestampFromOffchainRevocationReceipt)(receipt));
    }
    // Returns the domain separator used in the encoding of the signatures for attest, and revoke
    getDomainSeparator() {
        return this.contract.getDomainSeparator();
    }
    // Returns the current nonce per-account.
    getNonce(address) {
        return this.contract.getNonce(address);
    }
    // Returns the EIP712 type hash for the attest function
    getAttestTypeHash() {
        return this.contract.getAttestTypeHash();
    }
    // Returns the EIP712 type hash for the revoke function
    getRevokeTypeHash() {
        return this.contract.getRevokeTypeHash();
    }
    // Sets the delegated attestations helper
    async setDelegated() {
        this.delegated = new offchain_1.Delegated({
            address: await this.contract.getAddress(),
            version: await this.getVersion(),
            chainId: await this.getChainId()
        });
        return this.delegated;
    }
    // Sets the offchain attestations helper
    async setOffchain() {
        this.offchain = new offchain_1.Offchain({
            address: await this.contract.getAddress(),
            version: await this.getVersion(),
            chainId: await this.getChainId()
        }, offchain_1.OffchainAttestationVersion.Version2, this);
        return this.offchain;
    }
}
exports.EAS = EAS;
//# sourceMappingURL=eas.js.map