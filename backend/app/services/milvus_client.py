from pymilvus import MilvusClient, DataType, Function, FunctionType
from app.config import settings

class MilvusConnection:
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MilvusConnection, cls).__new__(cls)
        return cls._instance

    def get_client(self) -> MilvusClient:
        if self._client is None:
            self._client = MilvusClient(uri=settings.MILVUS_URI)
        return self._client


milvus_conn = MilvusConnection()

def ensure_collection():
    """Ensure the Milvus collection exists and has the correct schema/indexes."""
    client = milvus_conn.get_client()
    collection_name = settings.MILVUS_COLLECTION_NAME

    if client.has_collection(collection_name=collection_name):
        return

    # Create schema
    schema = MilvusClient.create_schema(
        auto_id=True,
        enable_dynamic_field=False
    )

    schema.add_field(field_name="id", datatype=DataType.INT64, is_primary=True)
    schema.add_field(field_name="job_db_id", datatype=DataType.INT64)
    schema.add_field(field_name="position_id", datatype=DataType.VARCHAR, max_length=100)
    # Raw text field — Milvus BM25 Function reads from this to auto-generate sparse_vector
    schema.add_field(
        field_name="text",
        datatype=DataType.VARCHAR,
        max_length=65535,
        enable_analyzer=True,
        analyzer_params={"type": "chinese"},
    )
    schema.add_field(field_name="dense_vector", datatype=DataType.FLOAT_VECTOR, dim=settings.MILVUS_DENSE_DIM)
    schema.add_field(field_name="sparse_vector", datatype=DataType.SPARSE_FLOAT_VECTOR)

    # BM25 function: Milvus auto-tokenizes `text` and writes sparse vector
    schema.add_function(Function(
        name="text_bm25",
        function_type=FunctionType.BM25,
        input_field_names=["text"],
        output_field_names=["sparse_vector"],
    ))

    # Create index parameters
    index_params = client.prepare_index_params()

    index_params.add_index(
        field_name="dense_vector",
        index_type="HNSW",
        metric_type="COSINE",
        params={"M": 16, "efConstruction": 200}
    )

    index_params.add_index(
        field_name="sparse_vector",
        index_type="SPARSE_INVERTED_INDEX",
        metric_type="BM25"
    )

    # Create collection
    client.create_collection(
        collection_name=collection_name,
        schema=schema,
        index_params=index_params
    )

    client.load_collection(collection_name)
