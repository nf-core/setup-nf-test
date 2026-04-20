process SAY_HELLO {
    output:
    path "hello.txt"

    script:
    """
    echo "Hello, nf-test!" > hello.txt
    """
}

workflow {
    SAY_HELLO()
}
